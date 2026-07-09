const router = require('express').Router();
const axios  = require('axios');
const db     = require('../db');
const authMiddleware = require('../middleware/auth');

// -----------------------------------------------------------------------
// Helper: genera número de pedido único tipo AC-20260709-XXXX
// -----------------------------------------------------------------------
const generarNumeroPedido = () => {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.floor(Math.random() * 9000 + 1000);
  return `AC-${fecha}-${rand}`;
};

// -----------------------------------------------------------------------
// @route   POST /api/orders
// @desc    Crear un nuevo pedido (Checkout)
// -----------------------------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
  const {
    items,
    buyerName,
    buyerPhone,
    deliveryAddress,
    deliveryCity,
    currency,
    paymentMethod
  } = req.body;

  if (!items || items.length === 0 || !buyerName || !buyerPhone ||
      !deliveryAddress || !deliveryCity || !currency || !paymentMethod) {
    return res.status(400).json({ message: 'Por favor proporcione todos los datos de entrega y productos.' });
  }

  // Mapear moneda del frontend al ENUM de la BD
  const monedaMap = { USD: 'USD', BOB: 'BOB' };
  const monedaDB  = monedaMap[currency] || 'BOB';

  // Mapear método de pago al ENUM de la BD
  const metodoMap = { qr: 'qr', card: 'tarjeta', delivery: 'delivery', transferencia: 'transferencia', cripto: 'cripto' };
  const metodoDB  = metodoMap[paymentMethod] || 'qr';

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let totalUSD = 0;
    const itemsConDetalles = [];

    // Validar stock y precios en la BD
    for (const item of items) {
      const { product, qty } = item;

      const prodRes = await client.query(
        `SELECT p.id, p.nombre, p.precio_usd, p.stock, p.vendedor_id, pv.nombre_tienda, p.img_url
         FROM productos p
         JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
         WHERE p.id = $1 AND p.estado = 'activo'
         FOR UPDATE`,
        [product.id]
      );

      if (prodRes.rows.length === 0) {
        throw new Error(`El producto "${product.name}" no está disponible.`);
      }

      const dbProd = prodRes.rows[0];

      if (dbProd.stock < qty) {
        throw new Error(`Stock insuficiente para "${dbProd.nombre}". Quedan ${dbProd.stock} unidades y pediste ${qty}.`);
      }

      // Descontar stock
      await client.query(
        'UPDATE productos SET stock = stock - $1 WHERE id = $2',
        [qty, dbProd.id]
      );

      const precioUSD = Number(dbProd.precio_usd);
      totalUSD += precioUSD * qty;

      itemsConDetalles.push({
        product: {
          id:        dbProd.id,
          name:      dbProd.nombre,
          priceUSD:  precioUSD,
          seller:    dbProd.nombre_tienda,
          seller_id: dbProd.vendedor_id,
          img:       dbProd.img_url
        },
        qty
      });
    }

    const numeroPedido = generarNumeroPedido();

    // Insertar el pedido
    const nuevoPedido = await client.query(
      `INSERT INTO pedidos
         (comprador_id, numero_pedido, estado, moneda, tasa_cambio,
          direccion_entrega, ciudad_entrega, nombre_comprador, telefono_comprador,
          metodo_pago, total, items_json)
       VALUES ($1, $2, 'pendiente', $3, 6.96, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, numero_pedido AS "numeroPedido", estado, moneda,
                 direccion_entrega AS "deliveryAddress", ciudad_entrega AS "deliveryCity",
                 nombre_comprador AS "buyerName", telefono_comprador AS "buyerPhone",
                 metodo_pago AS "paymentMethod", total AS "totalUSD", created_at AS "createdAt"`,
      [
        req.user.id,
        numeroPedido,
        monedaDB,
        deliveryAddress,
        deliveryCity,
        buyerName,
        buyerPhone,
        metodoDB,
        totalUSD,
        JSON.stringify(itemsConDetalles)
      ]
    );

    const pedido = nuevoPedido.rows[0];

    // Insertar detalle_pedido (un registro por ítem)
    for (const item of itemsConDetalles) {
      await client.query(
        `INSERT INTO detalle_pedido (pedido_id, producto_id, vendedor_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedido.id, item.product.id, item.product.seller_id, item.qty, item.product.priceUSD]
      );
    }

    await client.query('COMMIT');

    let paymentUrl = null;

    if (metodoDB === 'cripto') {
      try {
        const npApiKey = process.env.NOWPAYMENTS_API_KEY;
        if (npApiKey) {
          const npRes = await axios.post('https://api.nowpayments.io/v1/invoice', {
            price_amount: totalUSD,
            price_currency: 'usd',
            order_id: pedido.id,
            order_description: `Pedido ${pedido.numeroPedido} en Andean Commerce`,
            ipn_callback_url: 'https://tu-dominio.com/api/webhooks/nowpayments',
            success_url: 'http://localhost:5173/profile',
            cancel_url: 'http://localhost:5173/cart'
          }, {
            headers: {
              'x-api-key': npApiKey,
              'Content-Type': 'application/json'
            }
          });
          
          paymentUrl = npRes.data.invoice_url;

          // Guardar pago en la base de datos
          const pagoRes = await db.pool.query(
            `INSERT INTO pagos (pedido_id, metodo, moneda, monto, estado)
             VALUES ($1, 'cripto', $2, $3, 'pendiente') RETURNING id`,
            [pedido.id, monedaDB, totalUSD]
          );

          await db.pool.query(
            `INSERT INTO detalle_pago_cripto (pago_id, nowpayments_payment_id, moneda_pago, red, direccion_pago, monto_pago, monto_precio_usd, estado_cripto)
             VALUES ($1, $2, 'USDT', 'TRC20', 'pending', 0, $3, 'esperando')`,
            [pagoRes.rows[0].id, (npRes.data && npRes.data.id) ? npRes.data.id : ('inv-' + pedido.numeroPedido), totalUSD]
          );
        } else {
           console.warn("NOWPAYMENTS_API_KEY no configurada. URL de prueba generada.");
           paymentUrl = `https://nowpayments.io/payment/?iid=dummy-${pedido.numeroPedido}`;
        }
      } catch (npErr) {
        console.error('Error al crear invoice de NOWPayments:', npErr.response?.data || npErr.message);
      }
    }

    // Devolver en el mismo formato que el frontend espera
    res.status(201).json({
      id:              pedido.id,
      buyerName:       pedido.buyerName,
      buyerPhone:      pedido.buyerPhone,
      deliveryAddress: pedido.deliveryAddress,
      deliveryCity:    pedido.deliveryCity,
      currency:        currency,
      paymentMethod:   paymentMethod,
      totalUSD:        pedido.totalUSD,
      status:          'Pendiente',
      items:           itemsConDetalles,
      createdAt:       pedido.createdAt,
      paymentUrl:      paymentUrl
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ message: err.message || 'Error al procesar el pedido.' });
  } finally {
    client.release();
  }
});

// -----------------------------------------------------------------------
// @route   GET /api/orders/mine
// @desc    Obtener pedidos del comprador logueado
// -----------------------------------------------------------------------
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         nombre_comprador    AS "buyerName",
         telefono_comprador  AS "buyerPhone",
         direccion_entrega   AS "deliveryAddress",
         ciudad_entrega      AS "deliveryCity",
         moneda              AS currency,
         metodo_pago         AS "paymentMethod",
         total               AS "totalUSD",
         estado              AS status,
         items_json          AS items,
         created_at          AS "createdAt"
       FROM pedidos
       WHERE comprador_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener tus pedidos.' });
  }
});

module.exports = router;
