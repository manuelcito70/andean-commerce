import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ searchQuery, setSearchQuery, activeCategory, setActiveCategory }) => {
  const {
    user,
    logout,
    cart,
    currency,
    setCurrency,
    setAuthOpen,
    setCartOpen,
    setSellerDashOpen,
    wishlist
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cartCount = cart.reduce((total, item) => total + item.qty, 0);

  const categories = [
    { id: 'all', label: 'Todo', emoji: '🛍️' },
    { id: 'artesanal', label: 'Artesanías', emoji: '🎨' },
    { id: 'alimentos', label: 'Alimentos', emoji: '🥬' },
    { id: 'ropa', label: 'Ropa & Moda', emoji: '👗' },
    { id: 'electronica', label: 'Electrónica', emoji: '📱' },
    { id: 'hogar', label: 'Hogar', emoji: '🏠' },
    { id: 'belleza', label: 'Belleza', emoji: '✨' },
  ];

  return (
    <header className="nb-header">
      {/* ── Barra superior ── */}
      <div className="nb-top">
        <div className="nb-top-inner">

          {/* Logo */}
          <div className="nb-logo" onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}>
            <img
              src="/andean comerce.png"
              alt="Andean Commerce"
              style={{ height: '190px', width: 'auto', display: 'block', pointerEvents: 'auto' }}
            />
          </div>

          {/* Buscador */}
          <div className="nb-search-wrap">
            <svg className="nb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
              <path d="m21 21-4.35-4.35" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="nb-search-input"
              placeholder="Buscar artesanías, alimentos, ropa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="nb-search-clear" onClick={() => setSearchQuery('')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Acciones */}
          <div className="nb-actions">
            {/* Toggle moneda */}
            <div className="nb-currency-toggle">
              <button
                className={`nb-cur-btn ${currency === 'BOB' ? 'active' : ''}`}
                onClick={() => setCurrency('BOB')}
              >
                Bs · BOB
              </button>
              <button
                className={`nb-cur-btn ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                $ · USD
              </button>
            </div>

            {/* Carrito */}
            <button className="nb-cart-btn" onClick={() => setCartOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="21" r="1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="20" cy="21" r="1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {cartCount > 0 && <span className="nb-cart-badge">{cartCount}</span>}
            </button>

            {/* Auth / User */}
            {user ? (
              <div className="nb-user-menu">
                <button className="nb-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <div className="nb-avatar">{user.avatar}</div>
                  <span className="nb-user-name">{user.name.split(' ')[0]}</span>
                  <svg className={`nb-chevron ${dropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="nb-dropdown-overlay" onClick={() => setDropdownOpen(false)} />
                    <ul className="nb-dropdown">
                      <li className="nb-dropdown-header">
                        <strong>{user.name}</strong>
                        <span className="nb-dropdown-role">
                          {user.role === 'vendedor' ? `Vendedor · ${user.storeName}` : 'Cliente'}
                        </span>
                      </li>

                      {user.role === 'vendedor' && (
                        <li>
                          <button onClick={() => { setDropdownOpen(false); setSellerDashOpen(true); }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                            Panel de vendedor
                          </button>
                        </li>
                      )}

                      <li>
                        <button onClick={() => { setDropdownOpen(false); alert(`Nombre: ${user.name}\nEmail: ${user.email}\nTeléfono: ${user.phone}\nCiudad: ${user.city || 'No especificada'}`); }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                          Mi perfil
                        </button>
                      </li>

                      {user.role === 'cliente' && (
                        <li>
                          <button onClick={() => { setDropdownOpen(false); alert('Historial de pedidos próximamente.'); }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Mis pedidos
                          </button>
                        </li>
                      )}

                      <li>
                        <button onClick={() => { setDropdownOpen(false); setActiveCategory('wishlist'); }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                          Favoritos ({wishlist.length})
                        </button>
                      </li>

                      <li className="nb-dropdown-divider" />
                      <li>
                        <button className="nb-logout-btn" onClick={() => { setDropdownOpen(false); logout(); }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                          Cerrar sesión
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <button className="nb-login-btn" onClick={() => setAuthOpen(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <span>Ingresar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Barra de categorías ── */}
      <nav className="nb-cat-nav">
        <div className="nb-cat-inner">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`nb-cat-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="nb-cat-emoji">{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <style>{`
        /* ── Wrapper principal ── */
        .nb-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--green-main);
          box-shadow: 0 2px 20px rgba(0,0,0,0.22);
        }

        /* ── Barra superior ── */
        .nb-top {
          background: var(--green-main);
          height: 60px;
          overflow: visible;
          position: relative;
          z-index: 100;
        }
        .nb-top-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 2rem;
          max-width: 1280px;
          margin: 0 auto;
          height: 100%;
        }

        /* ── Logo ── */
        .nb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          cursor: pointer;
          user-select: none;
          pointer-events: none;
          position: relative;
          z-index: 101;
        }
        .nb-logo-icon {
          width: 38px;
          height: 38px;
          background: var(--orange);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(232,102,13,0.45);
          transition: transform var(--transition-normal);
        }
        .nb-logo:hover .nb-logo-icon { transform: scale(1.08); }
        .nb-logo-text {
          font-family: var(--font-sans);
          font-size: 1.15rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .nb-logo-accent { color: var(--orange); }

        /* ── Buscador ── */
        .nb-search-wrap {
          flex: 1;
          position: relative;
          max-width: 560px;
        }
        .nb-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .nb-search-input {
          width: 100%;
          padding: 10px 40px 10px 42px;
          border-radius: 9999px;
          border: none;
          font-size: 0.92rem;
          font-family: var(--font-sans);
          background: rgba(255,255,255,0.15);
          color: #fff;
          outline: none;
          border: 1px solid rgba(255,255,255,0.1);
          transition: background var(--transition-normal), box-shadow var(--transition-normal);
        }
        .nb-search-input::placeholder { color: rgba(255,255,255,0.65); }
        .nb-search-input:focus {
          background: #fff;
          color: var(--foreground);
          box-shadow: 0 0 0 3px rgba(232,102,13,0.35);
        }
        .nb-search-clear {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.7);
          display: flex;
          align-items: center;
        }

        /* ── Acciones ── */
        .nb-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          flex-shrink: 0;
        }

        /* ── Toggle moneda ── */
        .nb-currency-toggle {
          display: flex;
          background: rgba(0,0,0,0.2);
          border-radius: 9999px;
          padding: 2px;
          gap: 2px;
        }
        .nb-cur-btn {
          font-family: var(--font-sans);
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255,255,255,0.75);
          padding: 5px 12px;
          border-radius: 9999px;
          transition: all var(--transition-fast);
        }
        .nb-cur-btn.active {
          background: var(--orange);
          color: #fff;
          box-shadow: 0 2px 6px rgba(232,102,13,0.4);
        }

        /* ── Carrito ── */
        .nb-cart-btn {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--orange);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(232,102,13,0.4);
          transition: transform var(--transition-normal), background var(--transition-normal);
        }
        .nb-cart-btn:hover { background: var(--orange-hover); transform: scale(1.08); }
        .nb-cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ffd60a;
          color: var(--foreground);
          font-size: 0.68rem;
          font-weight: 800;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--green-main);
        }

        /* ── Botón Ingresar ── */
        .nb-login-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 9999px;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          background: rgba(255,255,255,0.12);
          transition: background var(--transition-fast);
        }
        .nb-login-btn:hover { background: rgba(255,255,255,0.22); }

        /* ── Menú de usuario ── */
        .nb-user-menu { position: relative; }
        .nb-avatar-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          padding: 5px 10px 5px 5px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.1);
          transition: background var(--transition-fast);
        }
        .nb-avatar-btn:hover { background: rgba(255,255,255,0.2); }
        .nb-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--orange);
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255,255,255,0.2);
        }
        .nb-user-name {
          font-size: 0.88rem;
          font-weight: 600;
          display: none;
        }
        @media (min-width: 768px) { .nb-user-name { display: inline; } }
        .nb-chevron { transition: transform var(--transition-fast); }
        .nb-chevron.open { transform: rotate(180deg); }

        .nb-dropdown-overlay {
          position: fixed;
          inset: 0;
          background: transparent;
          z-index: 101;
        }
        .nb-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          background: var(--card);
          color: var(--foreground);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg), 0 0 0 1px var(--border);
          width: 230px;
          list-style: none;
          padding: 8px 0;
          z-index: 102;
          animation: slideUp 0.15s ease-out;
        }
        .nb-dropdown-header {
          padding: 10px 16px 12px;
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid var(--border);
          margin-bottom: 6px;
        }
        .nb-dropdown-header strong { font-size: 0.9rem; }
        .nb-dropdown-role { font-size: 0.72rem; color: var(--muted-foreground); margin-top: 2px; }
        .nb-dropdown li button {
          width: 100%;
          padding: 10px 16px;
          text-align: left;
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--foreground);
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background var(--transition-fast);
        }
        .nb-dropdown li button svg { color: var(--muted-foreground); }
        .nb-dropdown li button:hover { background: var(--secondary); color: var(--primary); }
        .nb-dropdown li button:hover svg { color: var(--primary); }
        .nb-dropdown-divider { height: 1px; background: var(--border); margin: 6px 0; }
        .nb-logout-btn { color: var(--destructive) !important; }
        .nb-logout-btn svg { color: var(--destructive) !important; }
        .nb-logout-btn:hover { background: rgba(192,57,43,0.08) !important; }

        /* ── Barra de categorías ── */
        .nb-cat-nav {
          background: var(--green-dark);
          border-top: 1px solid rgba(255,255,255,0.08);
          position: relative;
          z-index: 102;
        }
        .nb-cat-inner {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 2rem;
          max-width: 1280px;
          margin: 0 auto;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .nb-cat-inner::-webkit-scrollbar { display: none; }

        .nb-cat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          color: rgba(255,255,255,0.75);
          font-size: 0.86rem;
          font-weight: 500;
          white-space: nowrap;
          border-radius: var(--radius);
          transition: color var(--transition-fast), background var(--transition-fast);
          font-family: var(--font-sans);
        }
        .nb-cat-item:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .nb-cat-item.active {
          color: #fff;
          background: var(--orange);
          border-radius: 9999px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(232,102,13,0.4);
        }
        .nb-cat-emoji { font-size: 0.95rem; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .nb-top-inner { padding: 10px 1rem; flex-wrap: wrap; gap: 0.75rem; }
          .nb-search-wrap { order: 3; width: 100%; max-width: 100%; }
          .nb-cat-inner { padding: 0 1rem; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
