const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No hay token, autorización denegada.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkeyandeancommerce2026');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'El token no es válido o ha expirado.' });
  }
};
