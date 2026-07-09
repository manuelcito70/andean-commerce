import React from 'react';

const CategoryTabs = ({ activeCategory, setActiveCategory }) => {
  const categories = [
    { id: 'all', label: 'Todo', emoji: '🛍️' },
    { id: 'artesanal', label: 'Artesanías', emoji: '🧶' },
    { id: 'alimentos', label: 'Alimentos', emoji: '🌽' },
    { id: 'ropa', label: 'Ropa & Moda', emoji: '👗' },
    { id: 'electronica', label: 'Electrónica', emoji: '📱' },
    { id: 'hogar', label: 'Hogar', emoji: '🏠' },
    { id: 'belleza', label: 'Belleza', emoji: '✨' },
    { id: 'wishlist', label: 'Favoritos', emoji: '❤️' } // Agregamos favoritos como categoría oculta/especial
  ];

  // Filtrar para no mostrar favoritos en las tabs del navbar principal (se accede por dropdown)
  const visibleCategories = categories.filter(c => c.id !== 'wishlist');

  return (
    <div className="categories-tabs-wrapper">
      <div className="container categories-container">
        <div className="categories-scroll-area">
          {visibleCategories.map((cat) => (
            <button
              key={cat.id}
              className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="category-emoji">{cat.emoji}</span>
              <span className="category-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .categories-tabs-wrapper {
          background-color: var(--card);
          border-bottom: 1px solid var(--border);
          padding: 0.75rem 0;
          overflow: hidden;
        }

        .categories-container {
          display: flex;
          justify-content: center;
        }

        .categories-scroll-area {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none;  /* IE and Edge */
          padding: 4px 1.5rem;
          width: 100%;
          justify-content: flex-start;
        }

        @media (min-width: 768px) {
          .categories-scroll-area {
            justify-content: center;
            padding: 4px 0;
            overflow-x: visible;
          }
        }

        .categories-scroll-area::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }

        .category-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 9999px;
          background-color: var(--background);
          color: var(--muted-foreground);
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          transition: all var(--transition-fast);
          border: 1px solid transparent;
        }

        .category-pill:hover {
          background-color: var(--secondary);
          color: var(--primary);
          transform: translateY(-1px);
        }

        .category-pill.active {
          background-color: var(--primary);
          color: white;
          box-shadow: 0 4px 10px rgba(29, 92, 58, 0.2);
        }

        .category-emoji {
          font-size: 1.05rem;
        }

        .category-label {
          font-family: var(--font-sans);
        }
      `}</style>
    </div>
  );
};

export default CategoryTabs;
