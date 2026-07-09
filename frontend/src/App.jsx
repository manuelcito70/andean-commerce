import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
// CategoryTabs ahora está integrado dentro del Navbar
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import AuthModal from './components/AuthModal';
import SellerDashboard from './components/SellerDashboard';

const MainApp = () => {
  const { 
    user, 
    wishlist, 
    API_URL 
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  const catalogRef = useRef(null);

  // Cargar productos del backend
  useEffect(() => {
    const fetchProducts = async () => {
      // Si la categoría activa es 'wishlist', no llamamos a la API con ese filtro directo (el backend no soporta query params wishlist)
      // En su lugar, cargamos todos los productos y los filtramos en cliente
      const categoryFilter = activeCategory === 'wishlist' ? 'all' : activeCategory;

      setLoadingProducts(true);
      setProductsError(null);
      try {
        let url = `${API_URL}/products?category=${categoryFilter}`;
        if (searchQuery.trim() !== '') {
          url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('No se pudo cargar el catálogo de productos.');
        }
        
        const data = await res.json();
        
        // Si la categoría es 'wishlist', filtramos por los favoritos guardados
        if (activeCategory === 'wishlist') {
          const wishProducts = data.filter(p => wishlist.includes(p.id));
          setProducts(wishProducts);
        } else {
          setProducts(data);
        }

      } catch (err) {
        console.error(err);
        setProductsError(err.message || 'Error de conexión.');
      } finally {
        setLoadingProducts(false);
      }
    };

    // Debounce para la barra de búsqueda para no saturar al servidor
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [activeTabOrSearchChange(), wishlist, API_URL]);

  // Helper para agrupar variables de dependencia del useEffect de productos
  function activeTabOrSearchChange() {
    return `${activeCategory}_${searchQuery}`;
  }

  const scrollToProducts = () => {
    catalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Título dinámico para el catálogo
  const getCatalogTitle = () => {
    if (activeCategory === 'wishlist') {
      return 'Mis Favoritos ❤️';
    }
    
    const categoryNames = {
      all: 'Todos los productos',
      artesanal: 'Artesanías locales',
      alimentos: 'Alimentos y cultivos andinos',
      ropa: 'Ropa & Moda boliviana',
      electronica: 'Electrónica y accesorios',
      hogar: 'Hogar y decoración',
      belleza: 'Belleza e higiene natural'
    };

    return categoryNames[activeCategory] || 'Productos';
  };

  return (
    <div className="app-container">
      {/* Navbar principal */}
      <Navbar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        activeCategory={activeCategory} 
        setActiveCategory={setActiveCategory} 
      />

      <main className="main-content">
        {/* Hero Section */}
        <Hero onExploreClick={scrollToProducts} />

        {/* Trust Bar (Compra protegida, envíos, etc.) */}
        <TrustBar />


        {/* Catálogo de Productos */}
        <section ref={catalogRef} className="catalog-section" id="products-catalog">
          <div className="container">
            
            {/* Cabecera del Catálogo */}
            <div className="catalog-header">
              <h2 className="catalog-title">
                {getCatalogTitle()}
                <span className="catalog-count">({products.length} {products.length === 1 ? 'resultado' : 'resultados'})</span>
              </h2>
            </div>

            {/* Catálogo Grid / Loading / Error / Empty States */}
            {loadingProducts ? (
              <div className="catalog-state-msg">
                <div className="spinner"></div>
                <p>Cargando productos...</p>
              </div>
            ) : productsError ? (
              <div className="catalog-state-msg error">
                <p>⚠️ {productsError}</p>
              </div>
            ) : products.length === 0 ? (
              <div className="catalog-empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No encontramos productos</h3>
                <p>Intenta buscar con otros términos o cambia la categoría activa.</p>
                {(searchQuery || activeCategory !== 'all') && (
                  <button className="btn btn-primary btn-rounded" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
                    Ver catálogo completo
                  </button>
                )}
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="main-footer">
        <div className="mf-inner">
          <div className="mf-brand">
            <div className="mf-logo">
              <div className="mf-logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Andean <span className="mf-logo-acc">Commerce</span></span>
            </div>
            <p className="mf-tagline">El mercado digital que conecta a productores, artesanos y emprendedores locales con toda Bolivia.</p>
          </div>

          <div className="mf-col">
            <h4>Comprar</h4>
            <ul>
              <li><button onClick={() => { setActiveCategory('artesanal'); scrollToProducts(); }}>Artesanías</button></li>
              <li><button onClick={() => { setActiveCategory('alimentos'); scrollToProducts(); }}>Alimentos</button></li>
              <li><button onClick={() => { setActiveCategory('ropa'); scrollToProducts(); }}>Ropa & Moda</button></li>
              <li><button onClick={() => { setActiveCategory('hogar'); scrollToProducts(); }}>Hogar</button></li>
            </ul>
          </div>

          <div className="mf-col">
            <h4>Vender</h4>
            <ul>
              <li><button onClick={() => {}}>Regístrate como vendedor</button></li>
              <li><button onClick={() => {}}>Comisiones</button></li>
              <li><button onClick={() => {}}>Soporte</button></li>
            </ul>
          </div>

          <div className="mf-col">
            <h4>Pagos</h4>
            <ul>
              <li><button onClick={() => {}}>QR Bolivia</button></li>
              <li><button onClick={() => {}}>Tarjeta de crédito</button></li>
              <li><button onClick={() => {}}>Efectivo</button></li>
              <li><button onClick={() => {}}>BOB / USD</button></li>
            </ul>
          </div>
        </div>

        <div className="mf-bottom">
          <p>© {new Date().getFullYear()} Andean Commerce · Hecho en 🇧🇴 Bolivia</p>
          <p className="mf-notice">Cambio de referencia: 1 USD ≈ 6.96 BOB</p>
        </div>
      </footer>

      {/* Cajones y Modales */}
      <CartDrawer />
      <CheckoutModal />
      <AuthModal />
      <SellerDashboard />

      {/* Estilos del catálogo y footer */}
      <style>{`
        /* ── Catalog ── */
        .catalog-section {
          padding: 3rem 0;
        }

        .catalog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .catalog-title {
          font-family: var(--font-serif);
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--primary);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .catalog-count {
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--muted-foreground);
        }

        .catalog-state-msg {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 0;
          gap: 12px;
          color: var(--muted-foreground);
          font-size: 1rem;
        }

        .catalog-state-msg.error {
          color: var(--destructive);
          font-weight: 600;
        }

        .catalog-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 5rem 2rem;
          background-color: var(--card);
          border: 1px dashed var(--border);
          border-radius: var(--radius-xl);
          gap: 8px;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .catalog-empty-state h3 {
          font-size: 1.25rem;
          color: var(--primary);
        }

        .catalog-empty-state p {
          font-size: 0.9rem;
          color: var(--muted-foreground);
          margin-bottom: 1rem;
        }

        /* ── Footer ── */
        .main-footer {
          background: var(--green-dark);
          color: rgba(255,255,255,0.75);
          font-family: var(--font-sans);
          font-size: 0.875rem;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .mf-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 56px 2rem 40px;
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1fr;
          gap: 48px;
        }
        @media (max-width: 1024px) {
          .mf-inner { grid-template-columns: 1fr 1fr; gap: 36px; }
        }
        @media (max-width: 640px) {
          .mf-inner { grid-template-columns: 1fr; gap: 28px; padding: 36px 1.25rem 28px; }
        }

        .mf-brand { display: flex; flex-direction: column; gap: 14px; }
        .mf-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-sans);
          font-size: 1.15rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .mf-logo-icon {
          width: 34px;
          height: 34px;
          background: var(--orange);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .mf-logo-acc { color: var(--orange); }
        .mf-tagline {
          font-size: 0.86rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.65;
          max-width: 220px;
        }

        .mf-col h4 {
          font-family: var(--font-sans);
          font-size: 0.94rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 18px;
        }
        .mf-col ul { display: flex; flex-direction: column; gap: 12px; }
        .mf-col ul li button {
          font-size: 0.86rem;
          color: rgba(255,255,255,0.58);
          transition: color var(--transition-fast), padding-left var(--transition-fast);
          font-family: var(--font-sans);
          text-align: left;
        }
        .mf-col ul li button:hover { color: #fff; padding-left: 4px; }

        .mf-bottom {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 20px 2rem;
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.4);
        }
        .mf-notice { font-size: 0.76rem; }
      `}</style>

    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
