import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const AuthModal = () => {
  const { authOpen, setAuthOpen, login, register } = useAuth();

  if (!authOpen) return null;

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [role, setRole] = useState('cliente'); // cliente or vendedor

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('La Paz');
  const [storeName, setStoreName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const bolivianCities = [
    'La Paz', 'Cochabamba', 'Santa Cruz', 
    'Oruro', 'Potosí', 'Sucre', 
    'Trinidad', 'Cobija', 'Tarija'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        if (!email.trim() || !password) {
          throw new Error('Por favor rellene todos los campos.');
        }
        await login(email, password);
      } else {
        if (!name.trim() || !email.trim() || !password || !phone.trim()) {
          throw new Error('Por favor rellene todos los campos obligatorios.');
        }
        if (role === 'vendedor' && !storeName.trim()) {
          throw new Error('El nombre de la tienda es obligatorio para vendedores.');
        }

        const registerData = {
          name,
          email,
          password,
          phone,
          role,
          city,
          storeName: role === 'vendedor' ? storeName : null
        };
        await register(registerData);
      }

      // Cerrar modal al tener éxito
      setAuthOpen(false);
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setStoreName('');

    } catch (err) {
      setError(err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  // Rellenar automáticamente credenciales demo para facilitar pruebas
  const fillDemoCredentials = (demoRole) => {
    setError(null);
    if (demoRole === 'cliente') {
      setEmail('cliente@demo.bo');
      setPassword('demo123');
    } else {
      setEmail('vendedor@demo.bo');
      setPassword('demo123');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setAuthOpen(false)}>
      <div className="modal-content auth-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-section">
            <img src="/andean comerce2.png" alt="Andean Commerce Logo" style={{ height: '30px', width: 'auto', objectFit: 'contain' }} />
            <span className="auth-logo-text">Andean <span className="auth-logo-accent">Commerce</span></span>
          </div>
          <h3 className="auth-title">
            {isLoginMode ? '¡Te damos la bienvenida!' : 'Crea tu cuenta'}
          </h3>
          <p className="auth-subtitle">
            {isLoginMode ? 'Inicia sesión para comprar y vender' : 'Únete al marketplace de productores bolivianos'}
          </p>
          <button className="close-auth-btn" onClick={() => setAuthOpen(false)} aria-label="Cerrar modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form className="auth-form" onSubmit={handleSubmit}>
          
          {/* Selector de Rol */}
          <div className="role-selector-container">
            <span className="role-label">Tipo de cuenta:</span>
            <div className="role-options">
              <button 
                type="button" 
                className={`role-btn ${role === 'cliente' ? 'active' : ''}`}
                onClick={() => setRole('cliente')}
              >
                Comprador / Cliente
              </button>
              <button 
                type="button" 
                className={`role-btn ${role === 'vendedor' ? 'active' : ''}`}
                onClick={() => setRole('vendedor')}
              >
                Vendedor / Tienda
              </button>
            </div>
          </div>

          {/* Registro: Nombre Completo */}
          {!isLoginMode && (
            <div className="form-group">
              <label>Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Ej. Juan Pérez Quispe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Registro Vendedor: Nombre de Tienda */}
          {!isLoginMode && role === 'vendedor' && (
            <div className="form-group">
              <label>Nombre de la Tienda</label>
              <input 
                type="text" 
                placeholder="Ej. Artesanías del Valle"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>
          )}

          {/* Registro: Teléfono */}
          {!isLoginMode && (
            <div className="form-group">
              <label>Número de Teléfono</label>
              <input 
                type="tel" 
                placeholder="Ej. 71234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}

          {/* Registro: Ciudad */}
          {!isLoginMode && (
            <div className="form-group">
              <label>Ciudad</label>
              <select 
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {bolivianCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          )}

          {/* Email y Contraseña (Común a Login/Registro) */}
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-primary btn-full btn-rounded auth-submit-btn" disabled={loading}>
            {loading ? (
              <div className="spinner-small"></div>
            ) : (
              <span>{isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
            )}
          </button>

          {/* Toggle Mode */}
          <p className="auth-toggle-mode">
            {isLoginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button type="button" className="toggle-mode-btn" onClick={() => { setIsLoginMode(!isLoginMode); setError(null); }}>
              {isLoginMode ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </p>

          {/* Cuentas Demo Helpers (solo en login) */}
          {isLoginMode && (
            <div className="demo-accounts-box">
              <h5 className="demo-title">🔑 Cuentas de demostración para test:</h5>
              <div className="demo-buttons">
                <button type="button" className="demo-quick-btn" onClick={() => fillDemoCredentials('cliente')}>
                  Usar Cliente (cliente@demo.bo)
                </button>
                <button type="button" className="demo-quick-btn" onClick={() => fillDemoCredentials('vendedor')}>
                  Usar Vendedor (vendedor@demo.bo)
                </button>
              </div>
              <p className="demo-hint">* Ambas contraseñas son: <code>demo123</code></p>
            </div>
          )}

        </form>

      </div>

      <style>{`
        .auth-modal-content {
          max-width: 480px;
          border-radius: var(--radius-xl);
          background-color: var(--background);
        }

        .auth-header {
          padding: 2rem 1.5rem 1rem;
          text-align: center;
          background: linear-gradient(135deg, rgba(29, 92, 58, 0.08) 0%, rgba(232, 102, 13, 0.05) 100%);
          border-bottom: 1px solid var(--border);
          position: relative;
        }

        .auth-logo-section {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 1rem;
        }

        .auth-logo-icon {
          width: 24px;
          height: 24px;
          color: var(--primary);
        }

        .auth-logo-text {
          font-family: var(--font-serif);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .auth-logo-accent {
          color: var(--accent);
        }

        .auth-title {
          font-family: var(--font-serif);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.25rem;
        }

        .auth-subtitle {
          font-size: 0.8rem;
          color: var(--muted-foreground);
          line-height: 1.4;
        }

        .close-auth-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          color: var(--muted-foreground);
          transition: color var(--transition-fast);
        }

        .close-auth-btn:hover {
          color: var(--foreground);
        }

        .auth-error-box {
          background-color: rgba(192, 57, 43, 0.1);
          border-left: 4px solid var(--destructive);
          color: var(--destructive);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 1rem 1.5rem 0;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .auth-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-height: 70vh;
          overflow-y: auto;
        }

        .role-selector-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--card);
          padding: 8px 12px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }

        .role-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--muted-foreground);
        }

        .role-options {
          display: flex;
          gap: 8px;
        }

        .role-btn {
          flex: 1;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 8px;
          border-radius: var(--radius);
          background-color: var(--background);
          color: var(--muted-foreground);
          border: 1px solid transparent;
          transition: all var(--transition-fast);
        }

        .role-btn:hover {
          background-color: var(--secondary);
          color: var(--primary);
        }

        .role-btn.active {
          background-color: var(--primary);
          color: white;
        }

        .auth-submit-btn {
          margin-top: 0.5rem;
          padding: 12px;
          font-size: 0.95rem;
        }

        .auth-toggle-mode {
          font-size: 0.8rem;
          color: var(--muted-foreground);
          text-align: center;
          margin-top: 0.25rem;
        }

        .toggle-mode-btn {
          color: var(--primary);
          font-weight: 700;
          background: none;
          border: none;
          margin-left: 4px;
        }

        .toggle-mode-btn:hover {
          text-decoration: underline;
        }

        .demo-accounts-box {
          background-color: var(--muted);
          border-radius: var(--radius);
          padding: 12px;
          margin-top: 1rem;
          border: 1px dashed var(--border);
        }

        .demo-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--foreground);
          margin-bottom: 8px;
        }

        .demo-buttons {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .demo-quick-btn {
          width: 100%;
          text-align: left;
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--primary);
          transition: all var(--transition-fast);
        }

        .demo-quick-btn:hover {
          background-color: var(--secondary);
          transform: translateX(2px);
        }

        .demo-hint {
          font-size: 0.7rem;
          color: var(--muted-foreground);
          margin-top: 6px;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

export default AuthModal;
