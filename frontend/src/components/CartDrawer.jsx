import React from 'react';
import { useAuth } from '../context/AuthContext';

const CartDrawer = () => {
  const {
    cart,
    cartOpen,
    setCartOpen,
    removeFromCart,
    updateCartQty,
    setCheckoutOpen,
    formatPrice
  } = useAuth();

  if (!cartOpen) return null;

  const totalUSD = cart.reduce((sum, item) => sum + item.product.priceUSD * item.qty, 0);

  const handleCheckoutClick = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">Carrito de compras</h2>
          <button className="close-drawer-btn" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="empty-cart-view">
              <div className="empty-cart-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="empty-cart-text">Tu carrito está vacío</p>
              <p className="empty-cart-subtext">Parece que aún no has agregado ningún producto de nuestros productores locales.</p>
              <button className="btn btn-primary btn-rounded" onClick={() => setCartOpen(false)}>
                Seguir comprando
              </button>
            </div>
          ) : (
            <ul className="cart-items-list">
              {cart.map((item) => {
                const { product, qty } = item;
                return (
                  <li key={product.id} className="cart-item">
                    <img className="cart-item-img" src={product.img} alt={product.name} />
                    <div className="cart-item-details">
                      <h4 className="cart-item-name" title={product.name}>{product.name}</h4>
                      <p className="cart-item-seller">Vendedor: {product.seller}</p>
                      
                      <div className="cart-item-actions">
                        <div className="quantity-selector">
                          <button 
                            className="qty-btn"
                            onClick={() => updateCartQty(product.id, qty - 1)}
                            aria-label="Disminuir cantidad"
                          >
                            -
                          </button>
                          <span className="qty-value price-display">{qty}</span>
                          <button 
                            className="qty-btn"
                            onClick={() => updateCartQty(product.id, qty + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <span className="cart-item-subtotal price-display">{formatPrice(Number(product.priceUSD) * qty)}</span>
                      </div>
                    </div>
                    
                    <button 
                      className="delete-item-btn"
                      onClick={() => removeFromCart(product.id)}
                      aria-label="Eliminar producto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="summary-row">
              <span className="summary-label">Subtotal</span>
              <span className="summary-value price-display">{formatPrice(totalUSD)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Envío</span>
              <span className="summary-value shipping-free">Gratis</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total-row">
              <span className="total-label">Total</span>
              <span className="total-value price-display">{formatPrice(totalUSD)}</span>
            </div>
            
            <button className="btn btn-accent btn-full btn-rounded checkout-btn" onClick={handleCheckoutClick}>
              Proceder al pago
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .cart-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 200;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.25s ease-out;
        }

        .cart-drawer {
          background-color: var(--background);
          width: 100%;
          max-width: 420px;
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 25px -5px rgba(0,0,0,0.1), -10px 0 10px -5px rgba(0,0,0,0.04);
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--card);
        }

        .drawer-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--primary);
        }

        .close-drawer-btn {
          color: var(--muted-foreground);
          transition: color var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-drawer-btn:hover {
          color: var(--foreground);
        }

        .drawer-body {
          flex-grow: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .empty-cart-view {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 1rem;
        }

        .empty-cart-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: var(--muted);
          color: var(--muted-foreground);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .empty-cart-icon-wrapper svg {
          width: 40px;
          height: 40px;
        }

        .empty-cart-text {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .empty-cart-subtext {
          font-size: 0.85rem;
          color: var(--muted-foreground);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .cart-items-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .cart-item {
          display: flex;
          gap: 12px;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border);
          position: relative;
        }

        .cart-item-img {
          width: 70px;
          height: 70px;
          border-radius: var(--radius);
          object-fit: cover;
          background-color: var(--muted);
          flex-shrink: 0;
        }

        .cart-item-details {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0; /* previene desborde por textos largos */
        }

        .cart-item-name {
          font-family: var(--font-sans);
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--foreground);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 24px;
        }

        .cart-item-seller {
          font-size: 0.75rem;
          color: var(--muted-foreground);
          margin-top: 1px;
          margin-bottom: 6px;
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          background-color: var(--muted);
          border-radius: 9999px;
          padding: 2px;
          border: 1px solid var(--border);
        }

        .qty-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--foreground);
          transition: background-color var(--transition-fast);
        }

        .qty-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .qty-value {
          font-size: 0.85rem;
          font-weight: 700;
          min-width: 24px;
          text-align: center;
        }

        .cart-item-subtotal {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--primary);
        }

        .delete-item-btn {
          position: absolute;
          right: 0;
          top: 0;
          color: var(--muted-foreground);
          transition: color var(--transition-fast);
        }

        .delete-item-btn:hover {
          color: var(--destructive);
        }

        .delete-item-btn svg {
          width: 16px;
          height: 16px;
        }

        .drawer-footer {
          background-color: var(--card);
          border-top: 1px solid var(--border);
          padding: 1.5rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          color: var(--muted-foreground);
        }

        .shipping-free {
          color: var(--primary);
          font-weight: 700;
        }

        .summary-divider {
          height: 1px;
          background-color: var(--border);
          margin: 0.75rem 0;
        }

        .total-row {
          font-size: 1.1rem;
          color: var(--foreground);
          margin-bottom: 1.25rem;
        }

        .total-label {
          font-weight: 700;
        }

        .total-value {
          font-weight: 700;
          font-family: var(--font-serif);
          font-size: 1.25rem;
          color: var(--primary);
        }

        .checkout-btn {
          padding: 12px 24px;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
};

export default CartDrawer;
