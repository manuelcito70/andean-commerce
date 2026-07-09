import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ProductCard = ({ product }) => {
  const { 
    addToCart, 
    toggleWishlist, 
    wishlist, 
    formatPrice, 
    formatPriceSecondary,
    user,
    setAuthOpen
  } = useAuth();

  const [added, setAdded] = useState(false);

  const {
    id,
    name,
    category,
    seller,
    location,
    priceUSD,
    rating,
    reviews,
    stock,
    badge,
    img,
    description
  } = product;

  const isFavorite = wishlist.includes(id);

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (!user) { setAuthOpen(true); } else { toggleWishlist(id); }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    if (!user) { setAuthOpen(true); return; }
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // Renderizar estrellas (texto, estilo mercadobs)
  const renderStars = () => {
    const r = Math.round(Number(rating));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  };

  // Color del badge según categoría/texto
  const getBadgeClass = () => {
    if (!badge) return '';
    const b = badge.toLowerCase();
    if (b.includes('orgán') || b.includes('natural') || b.includes('artesanal')) return 'pb-badge-green';
    if (b.includes('premium') || b.includes('especial')) return 'pb-badge-purple';
    if (b.includes('electr') || b.includes('tech')) return 'pb-badge-blue';
    return 'pb-badge-orange';
  };

  return (
    <div className="pc-card">
      {/* ── Imagen ── */}
      <div className="pc-img-wrap">
        <img className="pc-img" src={img} alt={name} loading="lazy" />

        {/* Badge */}
        {badge && <span className={`pc-badge ${getBadgeClass()}`}>{badge}</span>}

        {/* Favorito */}
        <button
          className={`pc-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label="Favorito"
        >
          <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </button>

        {/* Stock bajo — banner abajo */}
        {stock > 0 && stock < 15 && (
          <div className="pc-stock-banner">Solo {stock} disponibles</div>
        )}
        {stock === 0 && (
          <div className="pc-out-overlay">Agotado</div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="pc-body">
        <p className="pc-vendor">📍 {location} · {seller}</p>

        <h3 className="pc-name" title={name}>{name}</h3>

        <div className="pc-rating">
          <span className="pc-stars">{renderStars()}</span>
          <span className="pc-rating-val">{Number(rating).toFixed(1)}</span>
          <span className="pc-rating-cnt">({reviews})</span>
        </div>

        {description && (
          <p className="pc-desc">{description}</p>
        )}

        <div className="pc-footer">
          <div className="pc-price">
            <div className="pc-price-main">{formatPrice(Number(priceUSD))}</div>
            <div className="pc-price-sec">{formatPriceSecondary(Number(priceUSD))}</div>
          </div>

          <button
            className={`pc-add-btn ${added ? 'added' : ''}`}
            onClick={handleAddClick}
            disabled={stock === 0}
          >
            {added ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>¡Listo!</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="#fff" strokeWidth="2"/>
                  <line x1="3" y1="6" x2="21" y2="6" stroke="#fff" strokeWidth="2"/>
                  <path d="M16 10a4 4 0 01-8 0" stroke="#fff" strokeWidth="2"/>
                </svg>
                <span>Añadir</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .pc-card {
          background: var(--card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-normal), box-shadow var(--transition-normal);
          animation: cardIn 0.45s ease both;
        }
        .pc-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        /* ── Imagen ── */
        .pc-img-wrap {
          position: relative;
          height: 210px;
          overflow: hidden;
          background: var(--muted);
        }
        .pc-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .pc-card:hover .pc-img { transform: scale(1.06); }

        /* ── Badge ── */
        .pc-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          font-family: var(--font-sans);
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
        }
        .pb-badge-green  { background: var(--green-main); color: #fff; }
        .pb-badge-orange { background: var(--orange); color: #fff; }
        .pb-badge-purple { background: #6b3fa0; color: #fff; }
        .pb-badge-blue   { background: #1a5fa8; color: #fff; }

        /* ── Favorito ── */
        .pc-fav-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.92);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), color var(--transition-fast);
          color: var(--muted-foreground);
        }
        .pc-fav-btn svg { width: 17px; height: 17px; }
        .pc-fav-btn:hover { transform: scale(1.15); color: var(--destructive); }
        .pc-fav-btn.active { color: var(--destructive); }

        /* ── Stock banner ── */
        .pc-stock-banner {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--orange);
          color: #fff;
          text-align: center;
          font-size: 0.76rem;
          font-weight: 700;
          padding: 6px;
          font-family: var(--font-sans);
        }
        .pc-out-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.52);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          backdrop-filter: blur(2px);
        }

        /* ── Body ── */
        .pc-body {
          padding: 14px 16px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .pc-vendor {
          font-size: 0.76rem;
          color: var(--muted-foreground);
          font-family: var(--font-sans);
        }
        .pc-name {
          font-family: var(--font-sans);
          font-size: 0.96rem;
          font-weight: 700;
          color: var(--foreground);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pc-rating {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .pc-stars {
          color: var(--star);
          font-size: 0.88rem;
          letter-spacing: 1px;
        }
        .pc-rating-val { font-size: 0.8rem; font-weight: 700; color: var(--foreground); }
        .pc-rating-cnt { font-size: 0.76rem; color: var(--muted-foreground); }

        .pc-desc {
          font-size: 0.78rem;
          color: var(--muted-foreground);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
        }

        /* ── Footer precio + botón ── */
        .pc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid var(--border);
        }
        .pc-price-main {
          font-family: var(--font-mono);
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--foreground);
          letter-spacing: -0.3px;
        }
        .pc-price-sec {
          font-size: 0.76rem;
          color: var(--muted-foreground);
          margin-top: 1px;
        }

        .pc-add-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 16px;
          background: var(--orange);
          color: #fff;
          font-weight: 700;
          font-size: 0.84rem;
          border-radius: 9999px;
          box-shadow: 0 2px 10px rgba(232,102,13,0.35);
          transition: background var(--transition-normal), transform var(--transition-normal), box-shadow var(--transition-normal);
          font-family: var(--font-sans);
        }
        .pc-add-btn:hover {
          background: var(--orange-hover);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(232,102,13,0.5);
        }
        .pc-add-btn:active { transform: scale(0.97); }
        .pc-add-btn:disabled {
          background: var(--muted-foreground);
          box-shadow: none;
          cursor: not-allowed;
        }
        .pc-add-btn.added {
          background: var(--green-main);
          animation: bounce 0.4s ease;
        }
      `}</style>
    </div>
  );
};

export default ProductCard;
