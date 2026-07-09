const router = require('express').Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Middleware para verificar que el usuario logueado es un vendedor
const sellerOnly = (req, res, next) => {
  if (req.user.role !== 'vendedor') {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de vendedor.' });
  }
  next();
};

// @route   GET /api/seller/stats
// @desc    Obtener estadísticas del panel de vendedor
router.get('/stats', [authMiddleware, sellerOnly], async (req, res) => {
  try {
    const sellerId = req.user.id;

    // 1. Obtener productos activos e información de rating
    const prodRes = await db.query(
      'SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 5.0) AS avg_rating FROM products WHERE seller_id = $1',
      [sellerId]
    );
    const productosActivos = prodRes.rows[0].count;
    const calificacion = Number(prodRes.rows[0].avg_rating).toFixed(1);

    // 2. Obtener pedidos que contienen productos de este vendedor
    const orderRes = await db.query(
      `SELECT status, items FROM orders WHERE items @> $1::jsonb`,
      [JSON.stringify([{ product: { seller_id: sellerId } }])]
    );

    let ventasMes = 0;
    let pedidosActivos = 0;

    orderRes.rows.forEach(order => {
      // Si el pedido está activo (Pendiente o Enviado), sumarlo
      if (order.status === 'Pendiente' || order.status === 'Enviado') {
        pedidosActivos++;
      }

      // Sumar el total de ventas correspondientes a este vendedor
      order.items.forEach(item => {
        if (item.product.seller_id === sellerId) {
          ventasMes += Number(item.product.priceUSD) * item.qty;
        }
      });
    });

    // 3. Obtener los últimos 5 pedidos recientes para la tabla
    const recentOrdersRes = await db.query(
      `SELECT id, buyer_name AS "buyerName", status, items, created_at AS "createdAt"
       FROM orders WHERE items @> $1::jsonb ORDER BY id DESC LIMIT 5`,
      [JSON.stringify([{ product: { seller_id: sellerId } }])]
    );

    // Formatear los pedidos recientes para que incluyan solo el monto y producto relevante para el vendedor
    const recentOrders = recentOrdersRes.rows.map(order => {
      let sellerTotal = 0;
      let productNames = [];
      order.items.forEach(item => {
        if (item.product.seller_id === sellerId) {
          sellerTotal += Number(item.product.priceUSD) * item.qty;
          productNames.push(`${item.product.name} (x${item.qty})`);
        }
      });

      return {
        id: order.id,
        buyerName: order.buyerName,
        status: order.status,
        createdAt: order.createdAt,
        products: productNames.join(', '),
        totalUSD: sellerTotal
      };
    });

    res.json({
      ventasMes,
      pedidosActivos,
      productosActivos,
      calificacion,
      recentOrders
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener estadísticas del vendedor.' });
  }
});

// @route   GET /api/seller/products
// @desc    Obtener productos de la tienda del vendedor logueado
router.get('/products', [authMiddleware, sellerOnly], async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, category, name, seller, location, price_usd AS "priceUSD", 
       rating, reviews, stock, badge, img, description 
       FROM products WHERE seller_id = $1 ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener tus productos.' });
  }
});

// @route   POST /api/seller/products
// @desc    Crear un nuevo producto
router.post('/products', [authMiddleware, sellerOnly], async (req, res) => {
  const { name, category, priceUSD, stock, badge, img, description } = req.body;

  if (!name || !category || priceUSD === undefined || stock === undefined) {
    return res.status(400).json({ message: 'Faltan campos obligatorios para crear el producto.' });
  }

  try {
    // Obtener detalles del vendedor (tienda y ciudad)
    const userRes = await db.query('SELECT store_name, city FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Vendedor no encontrado.' });
    }
    const { store_name, city } = userRes.rows[0];

    // Asignar imagen por defecto según categoría si no se proporciona
    const defaultImages = {
      artesanal: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&q=80&w=400',
      alimentos: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400',
      ropa: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=400',
      electronica: 'https://images.unsplash.com/photo-1609592424085-f5b2157b6f38?auto=format&fit=crop&q=80&w=400',
      hogar: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=400',
      belleza: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=400'
    };

    const productImage = img && img.trim() !== '' ? img : (defaultImages[category] || defaultImages.artesanal);

    const newProd = await db.query(
      `INSERT INTO products (category, name, seller, seller_id, location, price_usd, rating, reviews, stock, badge, img, description)
       VALUES ($1, $2, $3, $4, $5, $6, 5.0, 0, $7, $8, $9, $10)
       RETURNING id, category, name, seller, location, price_usd AS "priceUSD", rating, reviews, stock, badge, img, description`,
      [
        category,
        name.trim(),
        store_name,
        req.user.id,
        city || 'Bolivia',
        priceUSD,
        stock,
        badge ? badge.trim() : null,
        productImage,
        description ? description.trim() : null
      ]
    );

    res.status(201).json(newProd.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al publicar el producto.' });
  }
});

// @route   PATCH /api/seller/products/:id
// @desc    Editar stock o precio de un producto
router.patch('/products/:id', [authMiddleware, sellerOnly], async (req, res) => {
  const { id } = req.params;
  const { priceUSD, stock, name, description, category, badge } = req.body;

  try {
    // Validar que el producto sea del vendedor logueado
    const prodCheck = await db.query('SELECT * FROM products WHERE id = $1 AND seller_id = $2', [id, req.user.id]);
    if (prodCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado o no pertenece a tu tienda.' });
    }

    const fields = [];
    const values = [];

    if (priceUSD !== undefined) {
      fields.push(`price_usd = $${fields.length + 1}`);
      values.push(priceUSD);
    }
    if (stock !== undefined) {
      fields.push(`stock = $${fields.length + 1}`);
      values.push(stock);
    }
    if (name !== undefined) {
      fields.push(`name = $${fields.length + 1}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${fields.length + 1}`);
      values.push(description.trim());
    }
    if (category !== undefined) {
      fields.push(`category = $${fields.length + 1}`);
      values.push(category);
    }
    if (badge !== undefined) {
      fields.push(`badge = $${fields.length + 1}`);
      values.push(badge ? badge.trim() : null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No se enviaron campos para modificar.' });
    }

    values.push(id);
    values.push(req.user.id);

    const queryText = `UPDATE products SET ${fields.join(', ')} 
                       WHERE id = $${values.length - 1} AND seller_id = $${values.length}
                       RETURNING id, category, name, seller, location, price_usd AS "priceUSD", rating, reviews, stock, badge, img, description`;

    const result = await db.query(queryText, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el producto.' });
  }
});

// @route   GET /api/seller/orders
// @desc    Obtener los pedidos que involucran productos del vendedor logueado
router.get('/orders', [authMiddleware, sellerOnly], async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Buscar todas las órdenes que contengan productos de este vendedor
    const result = await db.query(
      `SELECT id, buyer_name AS "buyerName", buyer_phone AS "buyerPhone", 
       delivery_address AS "deliveryAddress", delivery_city AS "deliveryCity", 
       currency, payment_method AS "paymentMethod", total_usd AS "totalUSD", 
       status, items, created_at AS "createdAt"
       FROM orders WHERE items @> $1::jsonb ORDER BY id DESC`,
      [JSON.stringify([{ product: { seller_id: sellerId } }])]
    );

    // Formatear la lista de órdenes para mostrar el subtotal específico del vendedor
    const orders = result.rows.map(order => {
      let sellerItems = [];
      let sellerTotalUSD = 0;

      order.items.forEach(item => {
        if (item.product.seller_id === sellerId) {
          sellerItems.push(item);
          sellerTotalUSD += Number(item.product.priceUSD) * item.qty;
        }
      });

      return {
        id: order.id,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        totalUSD: order.totalUSD,            // total general de la orden
        sellerTotalUSD,                      // total que corresponde a este vendedor
        status: order.status,
        items: sellerItems,                  // solo items de este vendedor
        createdAt: order.createdAt
      };
    });

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener pedidos de tu tienda.' });
  }
});

// @route   PATCH /api/seller/orders/:id/status
// @desc    Actualizar el estado del pedido (Pendiente -> Enviado -> Entregado)
router.patch('/orders/:id/status', [authMiddleware, sellerOnly], async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pendiente', 'Enviado', 'Entregado'].includes(status)) {
    return res.status(400).json({ message: 'Estado del pedido no válido.' });
  }

  try {
    // Verificar que la orden contenga productos del vendedor
    const orderCheck = await db.query(
      `SELECT * FROM orders WHERE id = $1 AND items @> $2::jsonb`,
      [id, JSON.stringify([{ product: { seller_id: req.user.id } }])]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado o no contiene productos de tu tienda.' });
    }

    const updatedOrder = await db.query(
      `UPDATE orders SET status = $1 WHERE id = $2 
       RETURNING id, status`,
      [status, id]
    );

    res.json(updatedOrder.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el estado del pedido.' });
  }
});

// @route   PATCH /api/seller/profile
// @desc    Actualizar perfil de la tienda del vendedor
router.patch('/profile', [authMiddleware, sellerOnly], async (req, res) => {
  const { storeName, city, phone, name } = req.body;

  try {
    const fields = [];
    const values = [];

    if (storeName !== undefined) {
      fields.push(`store_name = $${fields.length + 1}`);
      values.push(storeName.trim());
    }
    if (city !== undefined) {
      fields.push(`city = $${fields.length + 1}`);
      values.push(city.trim());
    }
    if (phone !== undefined) {
      fields.push(`phone = $${fields.length + 1}`);
      values.push(phone.trim());
    }
    if (name !== undefined) {
      fields.push(`name = $${fields.length + 1}`);
      values.push(name.trim());
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No se enviaron campos para modificar.' });
    }

    values.push(req.user.id);
    const queryText = `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
                       RETURNING name, email, phone, role, store_name AS "storeName", city, avatar`;

    const updatedUser = await db.query(queryText, values);

    // Actualizar de forma consistente la información denormalizada en los productos
    if (storeName || city) {
      const updateProdFields = [];
      const prodParams = [];

      if (storeName) {
        updateProdFields.push(`seller = $${updateProdFields.length + 1}`);
        prodParams.push(storeName.trim());
      }
      if (city) {
        updateProdFields.push(`location = $${updateProdFields.length + 1}`);
        prodParams.push(city.trim());
      }
      prodParams.push(req.user.id);
      await db.query(
        `UPDATE products SET ${updateProdFields.join(', ')} WHERE seller_id = $${prodParams.length}`,
        prodParams
      );
    }

    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el perfil de la tienda.' });
  }
});

module.exports = router;
