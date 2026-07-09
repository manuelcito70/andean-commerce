import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const CheckoutModal = () => {
  const {
    cart,
    checkoutOpen,
    setCheckoutOpen,
    clearCart,
    currency: globalCurrency,
    exchangeRate,
    formatPrice,
    token,
    API_URL
  } = useAuth();

  if (!checkoutOpen) return null;

  const [step, setStep] = useState(1); // 1 = Datos, 2 = Pago, 3 = Éxito
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Paso 1 Form Datos
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('La Paz');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Paso 2 Form Pago
  const [payCurrency, setPayCurrency] = useState(globalCurrency); // USD or BOB
  const [paymentMethod, setPaymentMethod] = useState('qr'); // qr, card, delivery

  // Tarjeta Details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  // QR Details (cargado desde el backend)
  const [qrCode, setQrCode] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  const bolivianCities = [
    'La Paz', 'Cochabamba', 'Santa Cruz', 
    'Oruro', 'Potosí', 'Sucre', 
    'Trinidad', 'Cobija', 'Tarija'
  ];

  const totalUSD = cart.reduce((sum, item) => sum + item.product.priceUSD * item.qty, 0);
  const totalPay = payCurrency === 'BOB' ? Math.round(totalUSD * exchangeRate) : totalUSD;
  const formattedTotalPay = payCurrency === 'BOB' ? `Bs. ${totalPay}` : `$${totalPay.toFixed(2)}`;

  // Cargar QR si se selecciona el método QR en el paso 2
  useEffect(() => {
    if (paymentMethod === 'qr' && step === 2) {
      const getQR = async () => {
        setQrLoading(true);
        try {
          const res = await fetch(`${API_URL}/payments/qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (res.ok) {
            const data = await res.json();
            setQrCode(data.qrCode);
          }
        } catch (err) {
          console.error('Error al generar QR:', err);
        } finally {
          setQrLoading(false);
        }
      };
      getQR();
    }
  }, [paymentMethod, step]);

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerPhone.trim() || !deliveryAddress.trim()) {
      setError('Por favor complete todos los datos de entrega.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Si el método es tarjeta, procesar cobro simulado
      if (paymentMethod === 'card') {
        if (!cardNumber.trim() || !cardExpiry.trim() || !cardCVV.trim()) {
          throw new Error('Por favor complete todos los datos de su tarjeta.');
        }

        const cardRes = await fetch(`${API_URL}/payments/card`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardNumber,
            cardExpiry,
            cardCVV,
            amount: totalUSD
          })
        });

        if (!cardRes.ok) {
          const cardData = await cardRes.json();
          throw new Error(cardData.message || 'Error al procesar el pago con tarjeta.');
        }
      }

      // 2. Crear orden en el backend
      const orderPayload = {
        items: cart,
        buyerName,
        buyerPhone,
        deliveryAddress,
        deliveryCity,
        currency: payCurrency,
        paymentMethod
      };

      const orderRes = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Error al registrar el pedido.');
      }

      // Si es pago cripto y tenemos URL de pago, redirigir
      if (paymentMethod === 'cripto' && orderData.paymentUrl) {
        clearCart(); // Limpiar el carrito antes de redirigir
        window.location.href = orderData.paymentUrl;
        return;
      }

      // 3. Flujo Exitoso
      setStep(3);
      setTimeout(() => {
        clearCart();
        setCheckoutOpen(false);
        // Reset estados
        setStep(1);
        setBuyerName('');
        setBuyerPhone('');
        setDeliveryAddress('');
        setCardNumber('');
        setCardExpiry('');
        setCardCVV('');
      }, 2500);

    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar tu pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setCheckoutOpen(false)}>
      <div className="modal-content checkout-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="checkout-header">
          <div className="checkout-steps-indicator">
            <span className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</span>
            <span className="step-line"></span>
            <span className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</span>
          </div>
          <h2 className="checkout-modal-title">
            {step === 1 ? 'Datos de Envío' : step === 2 ? 'Método de Pago' : '¡Pedido Realizado!'}
          </h2>
          <button className="close-checkout-btn" onClick={() => setCheckoutOpen(false)} disabled={step === 3}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="checkout-error-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{error}</span>
          </div>
        )}

        {/* Paso 1: Datos de entrega */}
        {step === 1 && (
          <form className="checkout-form" onSubmit={handleNextStep}>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Ej. María Flores Mamani"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Teléfono de Contacto</label>
              <input 
                type="tel" 
                placeholder="Ej. 71234567"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Ciudad / Departamento</label>
              <select 
                value={deliveryCity}
                onChange={(e) => setDeliveryCity(e.target.value)}
              >
                {bolivianCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Dirección de Entrega</label>
              <textarea 
                placeholder="Ej. Av. Arce Nro 123, Edificio Los Pinos, Apto 4B"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows="3"
                required
              />
            </div>

            <div className="checkout-footer">
              <div></div> {/* Espaciador */}
              <button type="submit" className="btn btn-accent btn-rounded">
                Continuar
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </button>
            </div>
          </form>
        )}

        {/* Paso 2: Método de Pago */}
        {step === 2 && (
          <div className="checkout-payment-step">
            
            {/* Selector de Moneda de Pago */}
            <div className="pay-currency-selector-section">
              <span className="section-subtitle">Moneda de pago:</span>
              <div className="pay-currency-toggle">
                <button 
                  className={`currency-btn ${payCurrency === 'BOB' ? 'active' : ''}`}
                  onClick={() => setPayCurrency('BOB')}
                >
                  Bolivianos (BOB)
                </button>
                <button 
                  className={`currency-btn ${payCurrency === 'USD' ? 'active' : ''}`}
                  onClick={() => setPayCurrency('USD')}
                >
                  Dólares (USD)
                </button>
              </div>
            </div>

            {/* Selector de Método de Pago */}
            <div className="payment-methods-grid">
              
              {/* QR */}
              <label className={`pay-method-card ${paymentMethod === 'qr' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="qr"
                  checked={paymentMethod === 'qr'}
                  onChange={() => setPaymentMethod('qr')}
                  className="sr-only"
                />
                <div className="method-card-content">
                  <svg className="method-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                  <div className="method-text">
                    <span className="method-title">QR Bolivia / Tigo Money</span>
                    <span className="method-desc">Escanea y paga al instante</span>
                  </div>
                </div>
              </label>

              {/* Tarjeta */}
              <label className={`pay-method-card ${paymentMethod === 'card' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="sr-only"
                />
                <div className="method-card-content">
                  <svg className="method-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                    <line x1="1" y1="10" x2="23" y2="10"></line>
                  </svg>
                  <div className="method-text">
                    <span className="method-title">Tarjeta Crédito / Débito</span>
                    <span className="method-desc">Visa, Mastercard, Amex</span>
                  </div>
                </div>
              </label>

              {/* Contra Entrega */}
              <label className={`pay-method-card ${paymentMethod === 'delivery' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="delivery"
                  checked={paymentMethod === 'delivery'}
                  onChange={() => setPaymentMethod('delivery')}
                  className="sr-only"
                />
                <div className="method-card-content">
                  <svg className="method-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                  <div className="method-text">
                    <span className="method-title">Pago contra entrega</span>
                    <span className="method-desc">Efectivo al recibir</span>
                  </div>
                </div>
              </label>

            </div>

            {/* Detalles dinámicos del pago */}
            <div className="payment-details-form">
              {paymentMethod === 'qr' && (
                <div className="qr-sim-container">
                  {qrLoading ? (
                    <div className="qr-spinner-wrapper">
                      <div className="spinner"></div>
                      <span>Generando QR Simple...</span>
                    </div>
                  ) : (
                    <>
                      <div className="qr-code-placeholder">
                        {/* Generamos una visualización gráfica bonita del QR */}
                        <div className="qr-grid-pattern">
                          <div className="qr-corner-box top-left"></div>
                          <div className="qr-corner-box top-right"></div>
                          <div className="qr-corner-box bottom-left"></div>
                          <div className="qr-center-logo">Bs</div>
                        </div>
                      </div>
                      <p className="qr-instruction">
                        Escanea el código con tu billetera móvil. Código de referencia: <code className="qr-code-text">{qrCode || 'Cargando...'}</code>
                      </p>
                    </>
                  )}
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="card-fields-grid">
                  <div className="form-group full-width">
                    <label>Número de Tarjeta</label>
                    <input 
                      type="text" 
                      placeholder="1234 5678 9876 5432"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Vencimiento (MM/AA)</label>
                    <input 
                      type="text" 
                      placeholder="12/28"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV (Código Seguridad)</label>
                    <input 
                      type="password" 
                      placeholder="***"
                      value={cardCVV}
                      onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').substring(0, 4))}
                      required
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'delivery' && (
                <div className="delivery-msg-box">
                  <p>📦 <strong>Pagarás al recibir:</strong> Prepara el monto exacto de <strong>{formattedTotalPay}</strong> al momento de la entrega para agilizar el proceso.</p>
                </div>
              )}
            </div>

            {/* Resumen Final del Pedido */}
            <div className="order-summary-box">
              <h4 className="summary-title">Resumen del pedido</h4>
              <ul className="summary-items">
                {cart.map(item => (
                  <li key={item.product.id}>
                    <span>{item.product.name} (x{item.qty})</span>
                    <span className="price-display">
                      {payCurrency === 'BOB' 
                        ? `Bs. ${Math.round(item.product.priceUSD * item.qty * exchangeRate)}` 
                        : `$${(item.product.priceUSD * item.qty).toFixed(2)}`}
                    </span>
                  </li>
                ))}
              </ul>
              {payCurrency === 'BOB' && (
                <p className="exchange-rate-notice">
                  * Tipo de cambio aplicado: 1 USD = {exchangeRate} BOB
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="checkout-footer">
              <button className="btn btn-outline btn-rounded" onClick={() => setStep(1)} disabled={loading}>
                Atrás
              </button>
              
              <button className="btn btn-accent btn-rounded" onClick={handleConfirmOrder} disabled={loading}>
                {loading ? (
                  <div className="spinner-small"></div>
                ) : (
                  <>
                    Confirmar · {formattedTotalPay}
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* Paso 3: Éxito */}
        {step === 3 && (
          <div className="success-screen">
            <div className="success-checkmark-wrapper">
              <div className="success-checkmark">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <h3 className="success-title">¡Pedido realizado!</h3>
            <p className="success-text">Tu orden ha sido registrada con éxito en el sistema.</p>
            <p className="success-subtext">El vendedor ha sido notificado y se encuentra preparando tu envío.</p>
          </div>
        )}

      </div>

      <style>{`
        .checkout-modal-content {
          max-width: 550px;
        }

        .checkout-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          background-color: var(--card);
        }

        .checkout-steps-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .step-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--muted);
          color: var(--muted-foreground);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          transition: all var(--transition-fast);
        }

        .step-dot.active {
          background-color: var(--primary);
          color: white;
        }

        .step-line {
          width: 50px;
          height: 2px;
          background-color: var(--border);
        }

        .checkout-modal-title {
          font-family: var(--font-serif);
          font-size: 1.4rem;
          color: var(--primary);
        }

        .close-checkout-btn {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          color: var(--muted-foreground);
          transition: color var(--transition-fast);
        }

        .close-checkout-btn:hover {
          color: var(--foreground);
        }

        .checkout-error-box {
          background-color: rgba(192, 57, 43, 0.1);
          border-left: 4px solid var(--destructive);
          color: var(--destructive);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 1rem 1.5rem 0;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .checkout-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--muted-foreground);
        }

        .checkout-footer {
          margin-top: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border);
          padding-top: 1.25rem;
        }

        .checkout-payment-step {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          max-height: 70vh;
          overflow-y: auto;
        }

        .pay-currency-selector-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background-color: var(--card);
          padding: 10px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }

        .section-subtitle {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--muted-foreground);
        }

        .pay-currency-toggle {
          display: flex;
          background-color: var(--muted);
          padding: 2px;
          border-radius: 9999px;
        }

        .pay-currency-toggle .currency-btn {
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 9999px;
          font-weight: 600;
          color: var(--muted-foreground);
        }

        .pay-currency-toggle .currency-btn.active {
          background-color: var(--primary);
          color: white;
        }

        .payment-methods-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pay-method-card {
          border: 2px solid var(--border);
          border-radius: var(--radius);
          padding: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          background-color: var(--card);
        }

        .pay-method-card:hover {
          border-color: var(--primary);
          background-color: var(--secondary);
        }

        .pay-method-card.active {
          border-color: var(--primary);
          background-color: var(--secondary);
        }

        .method-card-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .method-icon {
          width: 28px;
          height: 28px;
          color: var(--primary);
          flex-shrink: 0;
        }

        .method-text {
          display: flex;
          flex-direction: column;
        }

        .method-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .method-desc {
          font-size: 0.75rem;
          color: var(--muted-foreground);
        }

        .payment-details-form {
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 1rem;
        }

        .qr-sim-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .qr-spinner-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 2rem;
          font-size: 0.85rem;
          color: var(--muted-foreground);
        }

        .qr-code-placeholder {
          width: 140px;
          height: 140px;
          background-color: white;
          border: 8px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .qr-grid-pattern {
          width: 100%;
          height: 100%;
          border: 2px solid #000;
          position: relative;
          background-image: 
            radial-gradient(#000 20%, transparent 20%),
            radial-gradient(#000 20%, transparent 20%);
          background-size: 8px 8px;
          background-position: 0 0, 4px 4px;
        }

        .qr-corner-box {
          position: absolute;
          width: 24px;
          height: 24px;
          border: 4px solid #000;
          background-color: white;
        }

        .qr-corner-box.top-left { top: 4px; left: 4px; }
        .qr-corner-box.top-right { top: 4px; right: 4px; }
        .qr-corner-box.bottom-left { bottom: 4px; left: 4px; }

        .qr-center-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: var(--accent);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .qr-instruction {
          font-size: 0.8rem;
          color: var(--muted-foreground);
          line-height: 1.4;
        }

        .qr-code-text {
          font-weight: 700;
          color: var(--foreground);
        }

        .card-fields-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .card-fields-grid .full-width {
          grid-column: span 2;
        }

        .delivery-msg-box {
          color: var(--primary);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .order-summary-box {
          background-color: var(--muted);
          border-radius: var(--radius);
          padding: 1rem;
        }

        .summary-title {
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .summary-items {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.85rem;
        }

        .summary-items li {
          display: flex;
          justify-content: space-between;
          color: var(--muted-foreground);
        }

        .exchange-rate-notice {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          margin-top: 10px;
          border-top: 1px solid var(--border);
          padding-top: 6px;
          font-style: italic;
        }

        .spinner, .spinner-small {
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top: 3px solid var(--primary);
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
        }

        .spinner-small {
          border-width: 2px;
          border-top-color: white;
          width: 18px;
          height: 18px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Success screen styles */
        .success-screen {
          padding: 3rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: fadeIn 0.3s ease-out;
        }

        .success-checkmark-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: rgba(29, 92, 58, 0.1);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .success-checkmark {
          width: 44px;
          height: 44px;
          animation: checkScale 0.4s var(--transition-bounce);
        }

        @keyframes checkScale {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }

        .success-title {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          color: var(--primary);
          margin-bottom: 0.5rem;
        }

        .success-text {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--foreground);
          margin-bottom: 0.25rem;
        }

        .success-subtext {
          font-size: 0.8rem;
          color: var(--muted-foreground);
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
      `}</style>
    </div>
  );
};

export default CheckoutModal;
