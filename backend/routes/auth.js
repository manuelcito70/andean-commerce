const router  = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');
const authMiddleware = require('../middleware/auth');

// -----------------------------------------------------------------------
// @route   POST /api/auth/register
// @desc    Registrar un usuario (comprador o vendedor)
// -----------------------------------------------------------------------
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role, storeName, city } = req.body;

  // Validaciones básicas
  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Por favor rellene todos los campos obligatorios.' });
  }

  // El frontend usa 'cliente' y 'vendedor'; mapeamos a los ENUMs del nuevo schema
  const rolMap = { cliente: 'comprador', vendedor: 'vendedor' };
  const rolDB  = rolMap[role];
  if (!rolDB) {
    return res.status(400).json({ message: 'Rol no válido.' });
  }

  if (rolDB === 'vendedor' && !storeName) {
    return res.status(400).json({ message: 'El nombre de la tienda es obligatorio para vendedores.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar si el email ya está registrado
    const existente = await client.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Hashear contraseña
    const salt           = await bcrypt.genSalt(10);
    const contrasenaHash = await bcrypt.hash(password, salt);

    // Generar avatar (iniciales)
    const nameParts = name.trim().split(/\s+/);
    const avatar    = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase();

    // Insertar usuario
    const nuevoUsuario = await client.query(
      `INSERT INTO usuarios (nombre, email, contrasena_hash, telefono, rol, avatar)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, email, telefono, rol, avatar`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        contrasenaHash,
        phone.trim(),
        rolDB,
        avatar
      ]
    );

    const usuario = nuevoUsuario.rows[0];

    // Si es vendedor, crear perfil de tienda
    if (rolDB === 'vendedor') {
      await client.query(
        `INSERT INTO perfiles_vendedor (usuario_id, nombre_tienda, ciudad)
         VALUES ($1, $2, $3)`,
        [usuario.id, storeName.trim(), city ? city.trim() : null]
      );
    }

    await client.query('COMMIT');

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, role: role, email: usuario.email },   // 'role' en el token sigue siendo 'cliente'/'vendedor' para el frontend
      process.env.JWT_SECRET || 'supersecretkeyandeancommerce2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        name:      usuario.nombre,
        email:     usuario.email,
        phone:     usuario.telefono,
        role:      role,                 // 'cliente' o 'vendedor' para el frontend
        avatar:    usuario.avatar,
        storeName: rolDB === 'vendedor' ? storeName.trim() : null,
        city:      city ? city.trim() : null
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario.' });
  } finally {
    client.release();
  }
});

// -----------------------------------------------------------------------
// @route   POST /api/auth/login
// @desc    Iniciar sesión
// -----------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor ingrese correo y contraseña.' });
  }

  try {
    // Buscar usuario + perfil de vendedor (si aplica)
    const result = await db.query(
      `SELECT u.id, u.nombre, u.email, u.contrasena_hash, u.telefono, u.rol, u.avatar,
              pv.nombre_tienda, pv.ciudad
       FROM usuarios u
       LEFT JOIN perfiles_vendedor pv ON pv.usuario_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    const usuario = result.rows[0];

    // Comparar contraseña
    const isMatch = await bcrypt.compare(password, usuario.contrasena_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    // Mapear rol DB → rol frontend
    const rolFrontend = usuario.rol === 'comprador' ? 'cliente' : usuario.rol; // vendedor/admin se pasan tal cual

    // Generar JWT
    const token = jwt.sign(
      { id: usuario.id, role: rolFrontend, email: usuario.email },
      process.env.JWT_SECRET || 'supersecretkeyandeancommerce2026',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        name:      usuario.nombre,
        email:     usuario.email,
        phone:     usuario.telefono,
        role:      rolFrontend,
        avatar:    usuario.avatar,
        storeName: usuario.nombre_tienda || null,
        city:      usuario.ciudad || null
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión.' });
  }
});

// -----------------------------------------------------------------------
// @route   GET /api/auth/me
// @desc    Obtener datos del usuario logueado
// -----------------------------------------------------------------------
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.nombre AS name, u.email, u.telefono AS phone, u.rol, u.avatar,
              pv.nombre_tienda, pv.ciudad
       FROM usuarios u
       LEFT JOIN perfiles_vendedor pv ON pv.usuario_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const u = result.rows[0];
    const rolFrontend = u.rol === 'comprador' ? 'cliente' : u.rol;

    res.json({
      name:      u.name,
      email:     u.email,
      phone:     u.phone,
      role:      rolFrontend,
      avatar:    u.avatar,
      storeName: u.nombre_tienda || null,
      city:      u.ciudad || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor al obtener perfil.' });
  }
});

module.exports = router;
