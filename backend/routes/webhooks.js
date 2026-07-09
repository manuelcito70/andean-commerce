const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

// Ruta para NOWPayments IPN
router.post('/nowpayments', async (req, res) => {
  try {
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    
    if (!ipnSecret) {
      console.warn("NOWPAYMENTS_IPN_SECRET no configurada. Aceptando webhook sin verificar firma (INSEGURO).");
    } else {
      const sig = req.headers['x-nowpayments-sig'];
      if (!sig) {
        return res.status(400).send('Firma no proporcionada');
      }

      const hmac = crypto.createHmac('sha512', ipnSecret);
      hmac.update(JSON.stringify(req.body, Object.keys(req.body).sort()));
      const signature = hmac.digest('hex');

      if (signature !== sig) {
        return res.status(401).send('Firma inválida');
      }
    }

    const { payment_id, order_id, payment_status, actually_paid, pay_amount } = req.body;

    // Buscar pago en BD usando el order_id (que mandamos como pedido.id) o el payment_id
    const pagoCheck = await db.query(
      `SELECT p.id, p.pedido_id FROM pagos p 
       JOIN detalle_pago_cripto dpc ON p.id = dpc.pago_id
       WHERE p.pedido_id = $1 OR dpc.nowpayments_payment_id = $2`,
      [order_id, payment_id ? payment_id.toString() : '']
    );

    if (pagoCheck.rows.length === 0) {
      return res.status(404).send('Pago no encontrado');
    }

    const pago = pagoCheck.rows[0];

    // Mapear estado de NOWPayments a nuestro estado
    let estadoPago = 'pendiente';
    let estadoPedido = 'pendiente';
    let estadoCripto = 'esperando';

    if (payment_status === 'finished' || payment_status === 'confirmed') {
      estadoPago = 'completado';
      estadoPedido = 'pagado';
      estadoCripto = 'confirmado';
    } else if (payment_status === 'failed' || payment_status === 'expired') {
      estadoPago = 'fallido';
      estadoPedido = 'cancelado';
      estadoCripto = payment_status === 'expired' ? 'expirado' : 'fallido';
    } else if (payment_status === 'waiting' || payment_status === 'confirming') {
      estadoCripto = payment_status;
    }

    // Actualizar tablas
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Actualizar pagos
      await client.query(
        `UPDATE pagos SET estado = $1, pagado_en = CASE WHEN $1 = 'completado' THEN now() ELSE pagado_en END WHERE id = $2`,
        [estadoPago, pago.id]
      );

      // Actualizar detalle_pago_cripto
      await client.query(
        `UPDATE detalle_pago_cripto SET estado_cripto = $1, monto_pagado_real = $2 WHERE pago_id = $3`,
        [estadoCripto, actually_paid || pay_amount || 0, pago.id]
      );

      // Actualizar estado del pedido si corresponde
      if (estadoPedido !== 'pendiente') {
        await client.query(
          `UPDATE pedidos SET estado = $1 WHERE id = $2 AND estado = 'pendiente'`,
          [estadoPedido, pago.pedido_id]
        );
      }

      // Guardar el webhook payload
      await client.query(
        `INSERT INTO webhooks_pago (pago_id, payload, firma_ipn, procesado) VALUES ($1, $2, $3, true)`,
        [pago.id, JSON.stringify(req.body), req.headers['x-nowpayments-sig'] || null]
      );

      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error procesando webhook de NOWPayments:', error);
    res.status(500).send('Error interno');
  }
});

module.exports = router;
