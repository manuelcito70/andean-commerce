const router = require('express').Router();
const db     = require('../db');

// -----------------------------------------------------------------------
// Helper: construye la query de catálogo con filtros opcionales
// Devuelve columnas con nombres compatibles con el frontend React
// -----------------------------------------------------------------------
const buildCatalogQuery = (category, search) => {
  let queryText = `
    SELECT
      p.id,
      c.slug              AS category,
      p.nombre            AS name,
      pv.nombre_tienda    AS seller,
      p.vendedor_id       AS "sellerId",
      p.ubicacion         AS location,
      p.precio_usd        AS "priceUSD",
      p.calificacion_prom AS rating,
      p.num_resenas       AS reviews,
      p.stock,
      p.insignia          AS badge,
      p.img_url           AS img,
      p.descripcion       AS description
    FROM productos p
    JOIN usuarios u           ON u.id = p.vendedor_id
    JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
    LEFT JOIN categorias c    ON c.id = p.categoria_id
    WHERE p.estado = 'activo'
  `;

  const params = [];

  if (category && category !== 'all') {
    params.push(category);
    queryText += ` AND c.slug = $${params.length}`;
  }

  if (search && search.trim() !== '') {
    params.push(`%${search.trim()}%`);
    queryText += ` AND (p.nombre ILIKE $${params.length} OR pv.nombre_tienda ILIKE $${params.length})`;
  }

  queryText += ' ORDER BY p.created_at DESC';

  return { queryText, params };
};

// -----------------------------------------------------------------------
// @route   GET /api/products
// @desc    Obtener lista de productos con filtros opcionales
// -----------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { category, search } = req.query;

  try {
    const { queryText, params } = buildCatalogQuery(category, search);
    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
});

// -----------------------------------------------------------------------
// @route   GET /api/products/:id
// @desc    Obtener un producto por su UUID
// -----------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT
         p.id,
         c.slug              AS category,
         p.nombre            AS name,
         pv.nombre_tienda    AS seller,
         p.vendedor_id       AS "sellerId",
         p.ubicacion         AS location,
         p.precio_usd        AS "priceUSD",
         p.calificacion_prom AS rating,
         p.num_resenas       AS reviews,
         p.stock,
         p.insignia          AS badge,
         p.img_url           AS img,
         p.descripcion       AS description
       FROM productos p
       JOIN usuarios u           ON u.id = p.vendedor_id
       JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
       LEFT JOIN categorias c    ON c.id = p.categoria_id
       WHERE p.id = $1`,
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

// -----------------------------------------------------------------------
// @route   GET /api/exchange-rate
// @desc    Obtener la tasa de cambio fija BOB/USD
// -----------------------------------------------------------------------
router.get('/exchange-rate', (_req, res) => {
  res.json({ rate: 6.96 });
});

module.exports = router;
