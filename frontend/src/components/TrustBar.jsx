import React from 'react';

const TrustBar = () => {
  const items = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      label: 'Compra protegida',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="3" width="15" height="13" rx="1" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 8h4l3 3v5h-7V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="5.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
          <circle cx="18.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: 'Envío a todo Bolivia',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: 'Paga con QR',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2"/>
        </svg>
      ),
      label: 'USD · BOB',
    },
  ];

  return (
    <div className="trust-bar">
      <div className="trust-bar-inner">
        {items.map((item, i) => (
          <div key={i} className="trust-bar-item">
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        .trust-bar {
          background: #eef6f1;
          border-bottom: 1px solid #d0e9d8;
        }
        .trust-bar-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 14px 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 48px;
          flex-wrap: wrap;
        }
        .trust-bar-item {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 0.87rem;
          font-weight: 600;
          color: var(--green-main);
          font-family: var(--font-sans);
        }
        @media (max-width: 768px) {
          .trust-bar-inner { gap: 24px; padding: 12px 1rem; }
        }
      `}</style>
    </div>
  );
};

export default TrustBar;
