const router = require('express').Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Crear un nuevo pedido (Checkout)
router.post('/', authMiddleware, async (req, res) => {
  const { items, buyerName, buyerPhone, deliveryAddress, deliveryCity, currency, paymentMethod } = req.body;

  if (!items || items.length === 0 || !buyerName || !buyerPhone || !deliveryAddress || !deliveryCity || !currency || !paymentMethod) {
    return res.status(400).json({ message: 'Por favor proporcione todos los datos de entrega y productos.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    let totalUSD = 0;
    const itemsWithDetails = [];

    // Validar stock y precios en base de datos
    for (const item of items) {
      const { product, qty } = item;
      
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [product.id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`El producto "${product.name}" no está disponible.`);
      }

      const dbProduct = prodRes.rows[0];

      if (dbProduct.stock < qty) {
        throw new Error(`Stock insuficiente para "${dbProduct.name}". Quedan ${dbProduct.stock} unidades y pediste ${qty}.`);
      }

      // Restar stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, product.id]);

      const priceUSD = Number(dbProduct.price_usd);
      totalUSD += priceUSD * qty;

      itemsWithDetails.push({
        product: {
          id: dbProduct.id,
          name: dbProduct.name,
          priceUSD,
          seller: dbProduct.seller,
          seller_id: dbProduct.seller_id,
          img: dbProduct.img
        },
        qty
      });
    }

    // Insertar orden en la BD
    const newOrderRes = await client.query(
      `INSERT INTO orders (buyer_id, buyer_name, buyer_phone, delivery_address, delivery_city, currency, payment_method, total_usd, status, items)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente', $9)
       RETURNING id, buyer_name AS "buyerName", buyer_phone AS "buyerPhone", 
                 delivery_address AS "deliveryAddress", delivery_city AS "deliveryCity", 
                 currency, payment_method AS "paymentMethod", total_usd AS "totalUSD", 
                 status, items, created_at AS "createdAt"`,
      [
        req.user.id,
        buyerName,
        buyerPhone,
        deliveryAddress,
        deliveryCity,
        currency,
        paymentMethod,
        totalUSD,
        JSON.stringify(itemsWithDetails)
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(newOrderRes.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message || 'Error al procesar el pedido.' });
  } finally {
    client.release();
  }
});

// @route   GET /api/orders/mine
// @desc    Obtener pedidos del usuario comprador logueado
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, buyer_name AS "buyerName", buyer_phone AS "buyerPhone", 
       delivery_address AS "deliveryAddress", delivery_city AS "deliveryCity", 
       currency, payment_method AS "paymentMethod", total_usd AS "totalUSD", 
       status, items, created_at AS "createdAt"
       FROM orders WHERE buyer_id = $1 ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener tus pedidos.' });
  }
});

module.exports = router;
