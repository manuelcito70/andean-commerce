import React from 'react';
import { useAuth } from '../context/AuthContext';

const Hero = ({ onExploreClick }) => {
  const { user, setAuthOpen, setSellerDashOpen } = useAuth();

  const handleSellerCTA = () => {
    if (!user) {
      setAuthOpen(true);
    } else if (user.role === 'vendedor') {
      setSellerDashOpen(true);
    } else {
      alert('Tu cuenta es de tipo Cliente. Regístrate como Vendedor para publicar tus productos.');
    }
  };

  return (
    <section className="hero-section" id="hero">
      <div className="hero-overlay" />
      <div className="hero-content-wrap">

        {/* ── Lado izquierdo: texto ── */}
        <div className="hero-left">
          <div className="hero-badge-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                stroke="currentColor" strokeWidth="2"/>
            </svg>
            Envío gratis desde $25 USD · Bs. 174
          </div>

          <h1 className="hero-title">
            Lo mejor de Bolivia,<br />
            <em className="hero-title-em">en un solo lugar.</em>
          </h1>

          <p className="hero-subtitle">
            Artesanías, alimentos y productos locales.<br />
            Paga en bolivianos o dólares.
          </p>

          <div className="hero-cta">
            <button className="btn btn-accent btn-rounded hero-btn-primary" onClick={onExploreClick}>
              Explorar productos →
            </button>
            <button className="btn btn-outline btn-rounded hero-btn-secondary" onClick={handleSellerCTA}>
              {user?.role === 'vendedor' ? 'Mi panel de ventas' : 'Vender aquí'}
            </button>
          </div>
        </div>

        {/* ── Lado derecho: stats ── */}
        <div className="hero-stats-grid">
          <div className="hero-stat-card">
            <div className="hero-stat-number">150+</div>
            <div className="hero-stat-label">Vendedores activos</div>
          </div>
          <div className="hero-stat-card">
            <div className="hero-stat-number">1,200+</div>
            <div className="hero-stat-label">Productos disponibles</div>
          </div>
          <div className="hero-stat-card">
            <div className="hero-stat-number">9/9</div>
            <div className="hero-stat-label">Departamentos</div>
          </div>
          <div className="hero-stat-card">
            <div className="hero-stat-number">95%</div>
            <div className="hero-stat-label">Clientes satisfechos</div>
          </div>
        </div>

      </div>

      <style>{`
        .hero-section {
          position: relative;
          min-height: 380px;
          background:
            url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80')
            center/cover no-repeat;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            rgba(13, 50, 31, 0.93) 0%,
            rgba(13, 50, 31, 0.80) 55%,
            rgba(13, 50, 31, 0.58) 100%
          );
          z-index: 1;
        }

        .hero-content-wrap {
          position: relative;
          z-index: 2;
          max-width: 1280px;
          margin: 0 auto;
          padding: 56px 2rem;
          display: flex;
          align-items: center;
          gap: 48px;
          width: 100%;
        }

        /* ── Izquierda ── */
        .hero-left {
          flex: 1;
          max-width: 460px;
        }

        .hero-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(232,102,13,0.18);
          border: 1px solid rgba(232,102,13,0.45);
          color: #ffb07a;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 500;
          margin-bottom: 20px;
          animation: fadeDown 0.6s ease both;
        }

        .hero-title {
          font-family: var(--font-sans);
          font-size: 2.8rem;
          font-weight: 900;
          color: #fff;
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
          animation: fadeDown 0.6s ease 0.1s both;
        }

        .hero-title-em {
          font-family: var(--font-serif);
          font-style: italic;
          font-weight: 700;
          color: var(--orange);
        }

        .hero-subtitle {
          font-size: 1rem;
          color: rgba(255,255,255,0.82);
          margin-bottom: 28px;
          animation: fadeDown 0.6s ease 0.2s both;
          line-height: 1.65;
        }

        .hero-cta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          animation: fadeDown 0.6s ease 0.3s both;
        }

        .hero-btn-primary {
          padding: 13px 28px;
          font-size: 0.96rem;
          font-weight: 700;
        }
        .hero-btn-secondary {
          padding: 13px 28px;
          font-size: 0.96rem;
          font-weight: 600;
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.35) !important;
        }
        .hero-btn-secondary:hover {
          background: rgba(255,255,255,0.2) !important;
          border-color: rgba(255,255,255,0.65) !important;
        }

        /* ── Stats ── */
        .hero-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          flex-shrink: 0;
          animation: fadeUp 0.7s ease 0.15s both;
        }

        .hero-stat-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: var(--radius-lg);
          padding: 20px 24px;
          min-width: 150px;
          transition: transform var(--transition-normal), background var(--transition-normal);
        }
        .hero-stat-card:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.16);
        }

        .hero-stat-number {
          font-family: var(--font-sans);
          font-size: 1.9rem;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.5px;
        }
        .hero-stat-label {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.7);
          margin-top: 4px;
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .hero-content-wrap {
            flex-direction: column;
            align-items: flex-start;
          }
          .hero-stats-grid { width: 100%; }
        }
        @media (max-width: 768px) {
          .hero-section    { min-height: auto; }
          .hero-title      { font-size: 2rem; }
          .hero-content-wrap { padding: 40px 1.25rem; gap: 32px; }
          .hero-stats-grid { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>
    </section>
  );
};

export default Hero;
