const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Registrar un usuario (cliente o vendedor)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, role, storeName, city } = req.body;

  // Validaciones básicas
  if (!name || !email || !password || !phone || !role) {
    return res.status(400).json({ message: 'Por favor rellene todos los campos obligatorios.' });
  }

  if (role !== 'cliente' && role !== 'vendedor') {
    return res.status(400).json({ message: 'Rol no válido.' });
  }

  if (role === 'vendedor' && !storeName) {
    return res.status(400).json({ message: 'El nombre de la tienda es obligatorio para vendedores.' });
  }

  try {
    // Verificar si el usuario ya existe
    const userExist = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generar avatar a partir de iniciales
    const nameParts = name.trim().split(/\s+/);
    const avatar = nameParts.map(p => p[0]).join('').substring(0, 2).toUpperCase();

    // Guardar usuario
    const newUser = await db.query(
      `INSERT INTO users (name, email, password, phone, role, store_name, city, avatar)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, phone, role, store_name, city, avatar`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        phone.trim(),
        role,
        role === 'vendedor' ? storeName.trim() : null,
        city ? city.trim() : null,
        avatar
      ]
    );

    const user = newUser.rows[0];

    // Generar JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'supersecretkeyandeancommerce2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        storeName: user.store_name,
        city: user.city
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario.' });
  }
});

// @route   POST /api/auth/login
// @desc    Iniciar sesión
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor ingrese correo y contraseña.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    const user = result.rows[0];

    // Comparar contraseñas
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas.' });
    }

    // Generar JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'supersecretkeyandeancommerce2026',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        storeName: user.store_name,
        city: user.city
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión.' });
  }
});

// @route   GET /api/auth/me
// @desc    Obtener datos del usuario logueado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT name, email, phone, role, store_name AS "storeName", city, avatar FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en el servidor al obtener perfil.' });
  }
});

module.exports = router;
