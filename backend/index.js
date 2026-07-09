const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Log de peticiones simple
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Importar rutas
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const sellerRouter = require('./routes/seller');
const webhooksRouter = require('./routes/webhooks');

// Registrar rutas en Express
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/webhooks', webhooksRouter);

// Ruta directa para el Tipo de Cambio (como se especifica en el prompt)
app.get('/api/exchange-rate', (req, res) => {
  res.json({ rate: 6.96 });
});

// Simulación de pagos (no se almacenan datos sensibles)
app.post('/api/payments/qr', (req, res) => {
  const qrCode = `QR-BOB-${Math.floor(100000 + Math.random() * 900000)}`;
  res.json({ 
    qrCode, 
    message: 'Código QR generado correctamente. Escanee y pague al instante con su app de banco o Tigo Money.' 
  });
});

app.post('/api/payments/card', (req, res) => {
  const { cardNumber, cardExpiry, cardCVV, amount } = req.body;
  if (!cardNumber || !cardExpiry || !cardCVV) {
    return res.status(400).json({ message: 'Datos de tarjeta incompletos.' });
  }
  
  // Seguridad: nunca logueamos ni almacenamos datos sensibles como el CVV.
  const maskedCard = `XXXX-XXXX-XXXX-${cardNumber.slice(-4)}`;
  console.log(`Transacción de tarjeta procesada para: ${maskedCard} por un monto de $${amount} USD`);

  res.json({ 
    success: true, 
    transactionId: `TX-${Math.floor(10000000 + Math.random() * 90000000)}`, 
    message: 'Pago con tarjeta procesado con éxito.' 
  });
});

// Ruta base de prueba
app.get('/', (req, res) => {
  res.send('Servidor de Andean_Commerce corriendo con éxito 🚀');
});

// Escuchar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
