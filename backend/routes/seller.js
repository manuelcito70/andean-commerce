const router = require('express').Router();
const db     = require('../db');
const authMiddleware  = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloudinary = require('../config/cloudinary');

// Middleware: solo vendedores
const soloVendedor = (req, res, next) => {
  if (req.user.role !== 'vendedor') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
  }
  next();
};

// Imágenes por defecto según categoría (slug)
const defaultImages = {
  artesanal:  'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&q=80&w=400',
  alimentos:  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
  ropa:       'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=400',
  electronica:'https://images.unsplash.com/photo-1609592424085-f5b2157b6f38?auto=format&fit=crop&q=80&w=400',
  hogar:      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=400',
  belleza:    'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=400'
};

// -----------------------------------------------------------------------
// @route   GET /api/seller/stats
// @desc    Estadísticas del panel del vendedor
// -----------------------------------------------------------------------
router.get('/stats', [authMiddleware, soloVendedor], async (req, res) => {
  try {
    const vendedorId = req.user.id;

    // 1. Productos activos y calificación promedio
    const prodRes = await db.query(
      `SELECT COUNT(*)::int AS count, COALESCE(AVG(calificacion_prom), 5.0) AS avg_rating
       FROM productos WHERE vendedor_id = $1 AND estado = 'activo'`,
      [vendedorId]
    );
    const productosActivos = prodRes.rows[0].count;
    const calificacion     = Number(prodRes.rows[0].avg_rating).toFixed(1);

    // 2. Pedidos que incluyen productos de este vendedor
    const orderRes = await db.query(
      `SELECT p.estado, p.total, p.items_json, p.nombre_comprador AS "buyerName", p.created_at AS "createdAt", p.id
       FROM pedidos p
       WHERE p.items_json::text LIKE $1
       ORDER BY p.created_at DESC`,
      [`%${vendedorId}%`]
    );

    let ventasMes     = 0;
    let pedidosActivos = 0;

    orderRes.rows.forEach(order => {
      if (order.estado === 'pendiente' || order.estado === 'enviado') {
        pedidosActivos++;
      }
      if (order.items_json) {
        order.items_json.forEach(item => {
          if (item.product && item.product.seller_id === vendedorId) {
            ventasMes += Number(item.product.priceUSD) * item.qty;
          }
        });
      }
    });

    // 3. Últimos 5 pedidos recientes del vendedor
    const recentOrders = orderRes.rows.slice(0, 5).map(order => {
      let sellerTotal = 0;
      let productNames = [];

      if (order.items_json) {
        order.items_json.forEach(item => {
          if (item.product && item.product.seller_id === vendedorId) {
            sellerTotal += Number(item.product.priceUSD) * item.qty;
            productNames.push(`${item.product.name} (x${item.qty})`);
          }
        });
      }

      return {
        id:        order.id,
        buyerName: order.buyerName,
        status:    order.estado.charAt(0).toUpperCase() + order.estado.slice(1),
        createdAt: order.createdAt,
        products:  productNames.join(', '),
        totalUSD:  sellerTotal
      };
    });

    res.json({ ventasMes, pedidosActivos, productosActivos, calificacion, recentOrders });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estadísticas del vendedor.' });
  }
});

// -----------------------------------------------------------------------
// @route   GET /api/seller/products
// @desc    Obtener productos de la tienda del vendedor logueado
// -----------------------------------------------------------------------
router.get('/products', [authMiddleware, soloVendedor], async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         p.id,
         c.slug              AS category,
         p.nombre            AS name,
         pv.nombre_tienda    AS seller,
         p.ubicacion         AS location,
         p.precio_usd        AS "priceUSD",
         p.calificacion_prom AS rating,
         p.num_resenas       AS reviews,
         p.stock,
         p.insignia          AS badge,
         p.img_url           AS img,
         p.descripcion       AS description,
         p.estado
       FROM productos p
       JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
       LEFT JOIN categorias c    ON c.id = p.categoria_id
       WHERE p.vendedor_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener tus productos.' });
  }
});

// -----------------------------------------------------------------------
// @route   POST /api/seller/products
// @desc    Crear un nuevo producto
// -----------------------------------------------------------------------
router.post('/products', [authMiddleware, soloVendedor, upload.single('img')], async (req, res) => {
  const { name, category, priceUSD, stock, badge, description } = req.body;

  if (!name || !category || priceUSD === undefined || stock === undefined) {
    return res.status(400).json({ message: 'Faltan campos obligatorios para crear el producto.' });
  }

  try {
    // Obtener perfil del vendedor (ciudad)
    const perfilRes = await db.query(
      'SELECT nombre_tienda, ciudad FROM perfiles_vendedor WHERE usuario_id = $1',
      [req.user.id]
    );
    if (perfilRes.rows.length === 0) {
      return res.status(404).json({ message: 'Perfil de vendedor no encontrado.' });
    }
    const { ciudad } = perfilRes.rows[0];

    // Obtener id de la categoría por slug
    const catRes = await db.query('SELECT id FROM categorias WHERE slug = $1', [category]);
    const categoriaId = catRes.rows.length > 0 ? catRes.rows[0].id : null;

    let productImage = defaultImages[category] || defaultImages.artesanal;

    if (req.file) {
      // Subir a Cloudinary usando stream
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'andean_commerce/products' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const result = await uploadPromise;
      productImage = result.secure_url;
    }

    const newProd = await db.query(
      `INSERT INTO productos
         (vendedor_id, categoria_id, nombre, descripcion, ubicacion, precio_usd, stock, insignia, img_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        req.user.id,
        categoriaId,
        name.trim(),
        description ? description.trim() : null,
        ciudad || 'Bolivia',
        priceUSD,
        stock,
        badge ? badge.trim() : null,
        productImage
      ]
    );

    // Devolver el producto recién creado en el mismo formato que el frontend espera
    const creado = await db.query(
      `SELECT
         p.id,
         c.slug              AS category,
         p.nombre            AS name,
         pv.nombre_tienda    AS seller,
         p.ubicacion         AS location,
         p.precio_usd        AS "priceUSD",
         p.calificacion_prom AS rating,
         p.num_resenas       AS reviews,
         p.stock,
         p.insignia          AS badge,
         p.img_url           AS img,
         p.descripcion       AS description
       FROM productos p
       JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
       LEFT JOIN categorias c    ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [newProd.rows[0].id]
    );

    res.status(201).json(creado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al publicar el producto.' });
  }
});

// -----------------------------------------------------------------------
// @route   PATCH /api/seller/products/:id
// @desc    Editar un producto de la tienda
// -----------------------------------------------------------------------
router.patch('/products/:id', [authMiddleware, soloVendedor], async (req, res) => {
  const { id } = req.params;
  const { priceUSD, stock, name, description, category, badge } = req.body;

  try {
    // Verificar que el producto pertenece al vendedor logueado
    const prodCheck = await db.query(
      'SELECT id FROM productos WHERE id = $1 AND vendedor_id = $2',
      [id, req.user.id]
    );
    if (prodCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado o no pertenece a tu tienda.' });
    }

    const fields = [];
    const values = [];

    if (priceUSD !== undefined)  { fields.push(`precio_usd = $${fields.length + 1}`);   values.push(priceUSD); }
    if (stock !== undefined)     { fields.push(`stock = $${fields.length + 1}`);         values.push(stock); }
    if (name !== undefined)      { fields.push(`nombre = $${fields.length + 1}`);        values.push(name.trim()); }
    if (description !== undefined){ fields.push(`descripcion = $${fields.length + 1}`);  values.push(description.trim()); }
    if (badge !== undefined)     { fields.push(`insignia = $${fields.length + 1}`);      values.push(badge ? badge.trim() : null); }

    if (category !== undefined) {
      const catRes = await db.query('SELECT id FROM categorias WHERE slug = $1', [category]);
      if (catRes.rows.length > 0) {
        fields.push(`categoria_id = $${fields.length + 1}`);
        values.push(catRes.rows[0].id);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No se enviaron campos para modificar.' });
    }

    values.push(id);
    values.push(req.user.id);

    await db.query(
      `UPDATE productos SET ${fields.join(', ')}
       WHERE id = $${values.length - 1} AND vendedor_id = $${values.length}`,
      values
    );

    // Devolver el producto actualizado
    const actualizado = await db.query(
      `SELECT
         p.id,
         c.slug              AS category,
         p.nombre            AS name,
         pv.nombre_tienda    AS seller,
         p.ubicacion         AS location,
         p.precio_usd        AS "priceUSD",
         p.calificacion_prom AS rating,
         p.num_resenas       AS reviews,
         p.stock,
         p.insignia          AS badge,
         p.img_url           AS img,
         p.descripcion       AS description
       FROM productos p
       JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
       LEFT JOIN categorias c    ON c.id = p.categoria_id
       WHERE p.id = $1`,
      [id]
    );

    res.json(actualizado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el producto.' });
  }
});

// -----------------------------------------------------------------------
// @route   GET /api/seller/orders
// @desc    Obtener pedidos que contienen productos del vendedor logueado
// -----------------------------------------------------------------------
router.get('/orders', [authMiddleware, soloVendedor], async (req, res) => {
  try {
    const vendedorId = req.user.id;

    const result = await db.query(
      `SELECT
         p.id,
         p.nombre_comprador   AS "buyerName",
         p.telefono_comprador AS "buyerPhone",
         p.direccion_entrega  AS "deliveryAddress",
         p.ciudad_entrega     AS "deliveryCity",
         p.moneda             AS currency,
         p.metodo_pago        AS "paymentMethod",
         p.total              AS "totalUSD",
         p.estado,
         p.items_json,
         p.created_at         AS "createdAt"
       FROM pedidos p
       WHERE p.items_json::text LIKE $1
       ORDER BY p.created_at DESC`,
      [`%${vendedorId}%`]
    );

    const orders = result.rows.map(order => {
      let sellerItems    = [];
      let sellerTotalUSD = 0;

      if (order.items_json) {
        order.items_json.forEach(item => {
          if (item.product && item.product.seller_id === vendedorId) {
            sellerItems.push(item);
            sellerTotalUSD += Number(item.product.priceUSD) * item.qty;
          }
        });
      }

      return {
        id:              order.id,
        buyerName:       order.buyerName,
        buyerPhone:      order.buyerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryCity:    order.deliveryCity,
        currency:        order.currency,
        paymentMethod:   order.paymentMethod,
        totalUSD:        order.totalUSD,
        sellerTotalUSD,
        status:          order.estado.charAt(0).toUpperCase() + order.estado.slice(1),
        items:           sellerItems,
        createdAt:       order.createdAt
      };
    });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener pedidos de tu tienda.' });
  }
});

// -----------------------------------------------------------------------
// @route   PATCH /api/seller/orders/:id/status
// @desc    Actualizar estado de un pedido
// -----------------------------------------------------------------------
router.patch('/orders/:id/status', [authMiddleware, soloVendedor], async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  // Mapear estado del frontend al ENUM de la BD
  const estadoMap = {
    'Pendiente':  'pendiente',
    'Enviado':    'enviado',
    'Entregado':  'entregado',
    'Cancelado':  'cancelado'
  };
  const estadoDB = estadoMap[status];

  if (!estadoDB) {
    return res.status(400).json({ message: 'Estado del pedido no válido.' });
  }

  try {
    // Verificar que la orden contiene productos de este vendedor
    const orderCheck = await db.query(
      `SELECT id FROM pedidos WHERE id = $1 AND items_json::text LIKE $2`,
      [id, `%${req.user.id}%`]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado o no contiene productos de tu tienda.' });
    }

    const updated = await db.query(
      `UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING id, estado AS status`,
      [estadoDB, id]
    );

    res.json({
      id:     updated.rows[0].id,
      status: status   // devolvemos el formato del frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el estado del pedido.' });
  }
});

// -----------------------------------------------------------------------
// @route   PATCH /api/seller/profile
// @desc    Actualizar perfil de la tienda
// -----------------------------------------------------------------------
router.patch('/profile', [authMiddleware, soloVendedor], async (req, res) => {
  const { storeName, city, phone, name } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Actualizar tabla usuarios
    const userFields  = [];
    const userValues  = [];

    if (name  !== undefined) { userFields.push(`nombre = $${userFields.length + 1}`);   userValues.push(name.trim()); }
    if (phone !== undefined) { userFields.push(`telefono = $${userFields.length + 1}`); userValues.push(phone.trim()); }

    if (userFields.length > 0) {
      userValues.push(req.user.id);
      await client.query(
        `UPDATE usuarios SET ${userFields.join(', ')} WHERE id = $${userValues.length}`,
        userValues
      );
    }

    // Actualizar perfiles_vendedor
    const pvFields  = [];
    const pvValues  = [];

    if (storeName !== undefined) { pvFields.push(`nombre_tienda = $${pvFields.length + 1}`); pvValues.push(storeName.trim()); }
    if (city      !== undefined) { pvFields.push(`ciudad = $${pvFields.length + 1}`);        pvValues.push(city.trim()); }

    if (pvFields.length > 0) {
      pvValues.push(req.user.id);
      await client.query(
        `UPDATE perfiles_vendedor SET ${pvFields.join(', ')} WHERE usuario_id = $${pvValues.length}`,
        pvValues
      );

      // Actualizar ubicación y nombre de la tienda en los productos de este vendedor
      if (storeName) {
        await client.query(
          'UPDATE productos SET ubicacion = COALESCE($1, ubicacion) WHERE vendedor_id = $2',
          [city ? city.trim() : null, req.user.id]
        );
      }
    }

    await client.query('COMMIT');

    // Devolver perfil actualizado
    const perfilRes = await db.query(
      `SELECT u.nombre AS name, u.email, u.telefono AS phone, u.rol,
              u.avatar, pv.nombre_tienda AS "storeName", pv.ciudad AS city
       FROM usuarios u
       LEFT JOIN perfiles_vendedor pv ON pv.usuario_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const u = perfilRes.rows[0];
    res.json({
      name:      u.name,
      email:     u.email,
      phone:     u.phone,
      role:      'vendedor',
      avatar:    u.avatar,
      storeName: u.storeName,
      city:      u.city
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el perfil de la tienda.' });
  } finally {
    client.release();
  }
});

module.exports = router;
