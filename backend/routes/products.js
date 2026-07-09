const router = require('express').Router();
const db = require('../db');

// @route   GET /api/products
// @desc    Obtener lista de productos con filtros
router.get('/', async (req, res) => {
  const { category, search } = req.query;

  try {
    let queryText = `SELECT id, category, name, seller, seller_id AS "sellerId", location, 
                     price_usd AS "priceUSD", rating, reviews, stock, badge, img, description 
                     FROM products WHERE 1=1`;
    const queryParams = [];

    // Filtrar por categoría
    if (category && category !== 'all') {
      queryParams.push(category);
      queryText += ` AND category = $${queryParams.length}`;
    }

    // Filtrar por término de búsqueda (nombre del producto o de la tienda/vendedor)
    if (search && search.trim() !== '') {
      queryParams.push(`%${search.trim()}%`);
      queryText += ` AND (name ILIKE $${queryParams.length} OR seller ILIKE $${queryParams.length})`;
    }

    // Ordenar por ID descendente para ver los más nuevos primero
    queryText += ' ORDER BY id DESC';

    const result = await db.query(queryText, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
});

// @route   GET /api/products/:id
// @desc    Obtener un producto por su ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT id, category, name, seller, seller_id AS "sellerId", location, 
       price_usd AS "priceUSD", rating, reviews, stock, badge, img, description 
       FROM products WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener detalle del producto.' });
  }
});

// @route   GET /api/exchange-rate
// @desc    Obtener la tasa de cambio fija BOB por USD
router.get('/exchange-rate', (req, res) => {
  res.json({ rate: 6.96 });
});

module.exports = router;
