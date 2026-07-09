import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SellerDashboard = () => {
  const { 
    sellerDashOpen, 
    setSellerDashOpen, 
    user, 
    token, 
    formatPrice, 
    API_URL 
  } = useAuth();

  if (!sellerDashOpen) return null;

  const [activeTab, setActiveTab] = useState('overview'); // overview, products, orders, settings
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nuevo Producto Modal
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('artesanal');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodBadge, setProdBadge] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodImg, setProdImg] = useState(null);
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // Edición rápida de Stock/Precio
  const [editingProductId, setEditingProductId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  
  // Editar Tienda Form
  const [storeNameForm, setStoreNameForm] = useState(user?.storeName || '');
  const [cityForm, setCityForm] = useState(user?.city || 'La Paz');
  const [phoneForm, setPhoneForm] = useState(user?.phone || '');
  const [nameForm, setNameForm] = useState(user?.name || '');
  const [savingSettings, setSavingSettings] = useState(false);

  const bolivianCities = [
    'La Paz', 'Cochabamba', 'Santa Cruz', 
    'Oruro', 'Potosí', 'Sucre', 
    'Trinidad', 'Cobija', 'Tarija'
  ];

  // Carga inicial y recarga al cambiar de tab
  useEffect(() => {
    fetchDashboardData();
  }, [activeTab, token]);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      if (activeTab === 'overview') {
        const res = await fetch(`${API_URL}/seller/stats`, { headers });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          throw new Error('Error al cargar estadísticas.');
        }
      } else if (activeTab === 'products') {
        const res = await fetch(`${API_URL}/seller/products`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        } else {
          throw new Error('Error al cargar productos.');
        }
      } else if (activeTab === 'orders') {
        const res = await fetch(`${API_URL}/seller/orders`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else {
          throw new Error('Error al cargar pedidos.');
        }
      }
    } catch (err) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Crear Producto
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!prodName.trim() || prodPrice === '' || prodStock === '') {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    setSubmittingProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', prodName);
      formData.append('category', prodCategory);
      formData.append('priceUSD', prodPrice);
      formData.append('stock', prodStock);
      if (prodBadge) formData.append('badge', prodBadge);
      if (prodDescription) formData.append('description', prodDescription);
      if (prodImg) formData.append('img', prodImg);

      const res = await fetch(`${API_URL}/seller/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setNewProductModalOpen(false);
        // Limpiar form
        setProdName('');
        setProdPrice('');
        setProdStock('');
        setProdBadge('');
        setProdDescription('');
        setProdImg(null);
        // Recargar productos
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al guardar el producto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al guardar producto.');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Editar Producto (Rápido)
  const handleUpdateProductQuick = async (productId) => {
    try {
      const res = await fetch(`${API_URL}/seller/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          priceUSD: Number(editPrice),
          stock: parseInt(editStock)
        })
      });

      if (res.ok) {
        setEditingProductId(null);
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al actualizar el producto.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al actualizar.');
    }
  };

  // Cambiar Estado del Pedido
  const handleUpdateOrderStatus = async (orderId, currentStatus) => {
    let nextStatus = 'Pendiente';
    if (currentStatus === 'Pendiente') nextStatus = 'Enviado';
    else if (currentStatus === 'Enviado') nextStatus = 'Entregado';
    else return; // Ya está entregado

    const confirmChange = window.confirm(`¿Cambiar estado del pedido #${orderId} a "${nextStatus}"?`);
    if (!confirmChange) return;

    try {
      const res = await fetch(`${API_URL}/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        fetchDashboardData();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al actualizar estado.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar.');
    }
  };

  // Guardar Cambios Perfil
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!storeNameForm.trim() || !phoneForm.trim() || !nameForm.trim()) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    setSavingSettings(true);
    try {
      const res = await fetch(`${API_URL}/seller/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeName: storeNameForm,
          city: cityForm,
          phone: phoneForm,
          name: nameForm
        })
      });

      if (res.ok) {
        alert('Perfil de la tienda actualizado con éxito.');
        // Recargar la página o actualizar los datos del usuario logueado en la app
        window.location.reload(); // Forma más rápida de refrescar el AuthContext con la nueva sesión
      } else {
        const data = await res.json();
        alert(data.message || 'Error al actualizar perfil.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al guardar.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="seller-dashboard-overlay">
      <div className="seller-dashboard-layout">
        
        {/* Navbar Propio */}
        <nav className="seller-dash-nav">
          <div className="nav-left">
            <button className="back-btn" onClick={() => setSellerDashOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              <span>Volver a la tienda</span>
            </button>
            <span className="nav-divider">|</span>
            <span className="store-title-badge">🏢 {user?.storeName || 'Mi Tienda'}</span>
          </div>
          <div className="nav-right">
            <div className="nav-user-info">
              <span className="nav-owner-name">{user?.name}</span>
              <div className="avatar-circle-sm">{user?.avatar}</div>
            </div>
          </div>
        </nav>

        {/* Sidebar / Contenido principal grid */}
        <div className="dashboard-grid-container">
          
          {/* Menu Lateral de Tabs */}
          <aside className="dashboard-sidebar">
            <ul className="sidebar-menu">
              <li>
                <button className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                  📊 Resumen
                </button>
              </li>
              <li>
                <button className={`sidebar-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
                  📦 Mis Productos
                </button>
              </li>
              <li>
                <button className={`sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
                  🛒 Pedidos Recibidos
                </button>
              </li>
              <li>
                <button className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                  ⚙️ Configurar Tienda
                </button>
              </li>
            </ul>
          </aside>

          {/* Área de Contenido de la Tab */}
          <main className="dashboard-main-content">
            
            {loading && (
              <div className="dashboard-loading-overlay">
                <div className="spinner"></div>
                <span>Cargando datos del panel...</span>
              </div>
            )}

            {error && (
              <div className="dashboard-error-box">
                <p>⚠️ Error: {error}</p>
                <button className="btn btn-primary" onClick={fetchDashboardData}>Reintentar</button>
              </div>
            )}

            {/* TAB: RESUMEN (OVERVIEW) */}
            {!loading && !error && activeTab === 'overview' && stats && (
              <div className="tab-pane-content">
                <div className="welcome-banner">
                  <h2>¡Hola, {user?.name.split(' ')[0]}! 👋</h2>
                  <p>Este es el estado actual de <strong>{user?.storeName}</strong> el día de hoy.</p>
                </div>

                {/* Grid 4 Stats */}
                <div className="stats-cards-grid">
                  <div className="stat-card-widget sales">
                    <div className="widget-header">
                      <span className="widget-title">Ventas del mes</span>
                      <span className="widget-icon">💰</span>
                    </div>
                    <span className="widget-value price-display">{formatPrice(stats.ventasMes)}</span>
                  </div>

                  <div className="stat-card-widget orders">
                    <div className="widget-header">
                      <span className="widget-title">Pedidos Activos</span>
                      <span className="widget-icon">📦</span>
                    </div>
                    <span className="widget-value price-display">{stats.pedidosActivos}</span>
                  </div>

                  <div className="stat-card-widget products">
                    <div className="widget-header">
                      <span className="widget-title">Productos Publicados</span>
                      <span className="widget-icon">🛍️</span>
                    </div>
                    <span className="widget-value price-display">{stats.productosActivos}</span>
                  </div>

                  <div className="stat-card-widget rating">
                    <div className="widget-header">
                      <span className="widget-title">Calificación Tienda</span>
                      <span className="widget-icon">⭐</span>
                    </div>
                    <span className="widget-value price-display">{stats.calificacion} / 5.0</span>
                  </div>
                </div>

                {/* Tabla de Pedidos Recientes */}
                <div className="recent-orders-section">
                  <h3>Pedidos Recientes</h3>
                  {stats.recentOrders.length === 0 ? (
                    <div className="empty-table-msg">No has recibido pedidos todavía.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Nro Pedido</th>
                            <th>Productos</th>
                            <th>Comprador</th>
                            <th>Monto Recibido</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentOrders.map(order => (
                            <tr key={order.id}>
                              <td className="order-id-cell price-display">#{order.id}</td>
                              <td className="product-names-cell">{order.products}</td>
                              <td>{order.buyerName}</td>
                              <td className="price-display text-bold">{formatPrice(order.totalUSD)}</td>
                              <td>
                                <span className={`status-badge ${order.status.toLowerCase()}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: MIS PRODUCTOS */}
            {!loading && !error && activeTab === 'products' && (
              <div className="tab-pane-content">
                <div className="section-header-row">
                  <h2>Gestión de Catálogo</h2>
                  <button className="btn btn-accent btn-rounded" onClick={() => setNewProductModalOpen(true)}>
                    + Nuevo producto
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="empty-state-view">
                    <p>No tienes productos publicados.</p>
                    <button className="btn btn-primary btn-rounded" onClick={() => setNewProductModalOpen(true)}>Publicar mi primer producto</button>
                  </div>
                ) : (
                  <div className="seller-products-grid">
                    {products.map(prod => {
                      const isEditing = editingProductId === prod.id;
                      const stockPct = Math.min(100, (prod.stock / 50) * 100); // 50 unidades como referencia 100%
                      return (
                        <div key={prod.id} className="seller-product-card">
                          <img className="seller-prod-img" src={prod.img} alt={prod.name} />
                          <div className="seller-prod-body">
                            <span className="seller-prod-category">{prod.category}</span>
                            <h4 className="seller-prod-title">{prod.name}</h4>
                            
                            {isEditing ? (
                              <div className="quick-edit-fields">
                                <div className="form-group">
                                  <label>Precio (USD)</label>
                                  <input 
                                    type="number" 
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Stock</label>
                                  <input 
                                    type="number" 
                                    value={editStock}
                                    onChange={(e) => setEditStock(e.target.value)}
                                  />
                                </div>
                                <div className="quick-edit-actions">
                                  <button className="btn btn-primary btn-small" onClick={() => handleUpdateProductQuick(prod.id)}>Guardar</button>
                                  <button className="btn btn-outline btn-small" onClick={() => setEditingProductId(null)}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="prod-price-stock-row">
                                  <div className="price-col">
                                    <span className="label">Precio:</span>
                                    <span className="value price-display">{formatPrice(Number(prod.priceUSD))}</span>
                                  </div>
                                  <div className="stock-col">
                                    <span className="label">Disponibles:</span>
                                    <span className={`value ${prod.stock < 15 ? 'low-stock' : ''}`}>{prod.stock} uds</span>
                                  </div>
                                </div>

                                {/* Barra de Progreso de Stock */}
                                <div className="stock-progress-bar-container">
                                  <div className={`stock-progress-bar ${prod.stock < 15 ? 'low' : ''}`} style={{ width: `${stockPct}%` }}></div>
                                </div>

                                <button className="btn btn-outline btn-full quick-edit-btn" onClick={() => {
                                  setEditingProductId(prod.id);
                                  setEditPrice(prod.priceUSD);
                                  setEditStock(prod.stock);
                                }}>
                                  Editar Stock / Precio
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: PEDIDOS RECIBIDOS */}
            {!loading && !error && activeTab === 'orders' && (
              <div className="tab-pane-content">
                <h2>Pedidos Recibidos</h2>
                <p className="tab-hint-txt">Haz clic en el estado del pedido para actualizarlo (Pendiente → Enviado → Entregado).</p>

                {orders.length === 0 ? (
                  <div className="empty-state-view">
                    <p>Aún no has recibido pedidos en tu tienda.</p>
                  </div>
                ) : (
                  <div className="seller-orders-list">
                    {orders.map(order => (
                      <div key={order.id} className="seller-order-card">
                        <div className="order-card-header">
                          <span className="order-number price-display">Pedido #{order.id}</span>
                          <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        <div className="order-card-body">
                          <div className="buyer-info-col">
                            <h5>Datos de entrega:</h5>
                            <p><strong>Comprador:</strong> {order.buyerName}</p>
                            <p><strong>Teléfono:</strong> {order.buyerPhone}</p>
                            <p><strong>Dirección:</strong> {order.deliveryAddress} ({order.deliveryCity})</p>
                            <p><strong>Pago por:</strong> <span className="method-pill">{order.paymentMethod.toUpperCase()}</span> ({order.currency})</p>
                          </div>

                          <div className="order-items-col">
                            <h5>Productos comprados en tu tienda:</h5>
                            <ul className="order-items-sublist">
                              {order.items.map((item, idx) => (
                                <li key={idx}>
                                  <span>{item.product.name} (x{item.qty})</span>
                                  <span className="price-display">{formatPrice(item.product.priceUSD * item.qty)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="order-subtotal-row">
                              <span>Subtotal Recibido:</span>
                              <strong className="price-display">{formatPrice(order.sellerTotalUSD)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="order-card-footer">
                          <div className="status-control">
                            <span className="status-label">Estado:</span>
                            <span className={`status-badge-interactive ${order.status.toLowerCase()}`} onClick={() => handleUpdateOrderStatus(order.id, order.status)}>
                              {order.status}
                              {order.status !== 'Entregado' && <span className="status-next-arrow"> ➔ Actualizar</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: CONFIGURAR TIENDA (SETTINGS) */}
            {!loading && !error && activeTab === 'settings' && (
              <div className="tab-pane-content">
                <h2>Configurar Tienda</h2>
                <p className="tab-hint-txt">Modifica los detalles de tu tienda física y de contacto. Estos datos se sincronizarán en tus productos.</p>

                <form className="seller-settings-form" onSubmit={handleSaveProfile}>
                  <div className="form-group">
                    <label>Nombre de la Tienda</label>
                    <input 
                      type="text" 
                      value={storeNameForm} 
                      onChange={(e) => setStoreNameForm(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Ciudad de Ubicación</label>
                    <select 
                      value={cityForm} 
                      onChange={(e) => setCityForm(e.target.value)}
                    >
                      {bolivianCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Teléfono de Contacto</label>
                    <input 
                      type="text" 
                      value={phoneForm} 
                      onChange={(e) => setPhoneForm(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre de Propietario / Encargado</label>
                    <input 
                      type="text" 
                      value={nameForm} 
                      onChange={(e) => setNameForm(e.target.value)} 
                      required 
                    />
                  </div>

                  <button type="submit" className="btn btn-accent btn-rounded" disabled={savingSettings}>
                    {savingSettings ? 'Guardando cambios...' : 'Guardar Cambios'}
                  </button>
                </form>
              </div>
            )}

          </main>
        </div>

      </div>

      {/* MODAL CREAR NUEVO PRODUCTO */}
      {newProductModalOpen && (
        <div className="modal-overlay" onClick={() => setNewProductModalOpen(false)}>
          <div className="modal-content new-product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-header">
              <h3 className="checkout-modal-title">Nuevo Producto</h3>
              <button className="close-checkout-btn" onClick={() => setNewProductModalOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <form className="checkout-form" onSubmit={handleCreateProduct}>
              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input 
                  type="text" 
                  placeholder="Ej. Vasija pintada a mano"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                  <option value="artesanal">Artesanías</option>
                  <option value="alimentos">Alimentos</option>
                  <option value="ropa">Ropa & Moda</option>
                  <option value="electronica">Electrónica</option>
                  <option value="hogar">Hogar</option>
                  <option value="belleza">Belleza</option>
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Precio Base (USD) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="15.00"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Cantidad en Stock *</label>
                  <input 
                    type="number" 
                    placeholder="30"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Etiqueta / Badge (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Hecho a mano, Orgánico, Nuevo"
                  value={prodBadge}
                  onChange={(e) => setProdBadge(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Imagen del Producto</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setProdImg(e.target.files[0])}
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea 
                  placeholder="Escriba la descripción del producto..."
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  rows="3"
                />
              </div>

              <div className="checkout-footer">
                <div></div>
                <button type="submit" className="btn btn-accent btn-rounded" disabled={submittingProduct}>
                  {submittingProduct ? 'Publicando...' : 'Publicar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .seller-dashboard-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--background);
          z-index: 500;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.2s ease-out;
        }

        .seller-dashboard-layout {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .seller-dash-nav {
          background-color: var(--primary);
          color: white;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 60px;
          box-shadow: var(--shadow-md);
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
          color: white;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .back-btn:hover {
          color: var(--accent);
        }

        .nav-divider {
          color: rgba(255,255,255,0.3);
        }

        .store-title-badge {
          font-weight: 700;
          font-size: 1rem;
        }

        .nav-right {
          display: flex;
          align-items: center;
        }

        .nav-user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-owner-name {
          font-weight: 500;
          font-size: 0.9rem;
        }

        .avatar-circle-sm {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background-color: var(--accent);
          color: white;
          font-weight: 700;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dashboard-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          height: calc(100% - 60px);
        }

        @media (min-width: 768px) {
          .dashboard-grid-container {
            grid-template-columns: 240px 1fr;
          }
        }

        .dashboard-sidebar {
          background-color: var(--card);
          border-right: 1px solid var(--border);
          padding: 1.5rem 0;
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
        }

        @media (min-width: 768px) {
          .dashboard-sidebar {
            display: block;
            overflow-x: visible;
          }
        }

        .sidebar-menu {
          display: flex;
          width: 100%;
          list-style: none;
          gap: 4px;
          padding: 0 1rem;
        }

        @media (min-width: 768px) {
          .sidebar-menu {
            flex-direction: column;
            padding: 0;
          }
        }

        .sidebar-btn {
          width: 100%;
          text-align: left;
          padding: 12px 20px;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--muted-foreground);
          border-radius: 0;
          border-left: 3px solid transparent;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .sidebar-btn:hover {
          background-color: var(--background);
          color: var(--primary);
        }

        .sidebar-btn.active {
          background-color: var(--secondary);
          color: var(--primary);
          border-left-color: var(--primary);
        }

        .dashboard-main-content {
          padding: 2rem;
          overflow-y: auto;
          position: relative;
          background-color: var(--background);
        }

        .dashboard-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(250, 247, 242, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 0.9rem;
          color: var(--muted-foreground);
        }

        .tab-pane-content {
          animation: fadeIn 0.25s ease-out;
        }

        .welcome-banner {
          margin-bottom: 2rem;
        }

        .welcome-banner h2 {
          font-size: 1.75rem;
          color: var(--primary);
        }

        .welcome-banner p {
          font-size: 0.9rem;
          color: var(--muted-foreground);
        }

        /* 4 Stats Grid */
        .stats-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }

        @media (min-width: 992px) {
          .stats-cards-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .stat-card-widget {
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          box-shadow: var(--shadow-sm);
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .widget-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .widget-icon {
          font-size: 1.2rem;
        }

        .widget-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        /* Table CSS */
        .recent-orders-section h3 {
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }

        .empty-table-msg {
          text-align: center;
          padding: 2rem;
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--muted-foreground);
          font-size: 0.9rem;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .dashboard-table th, .dashboard-table td {
          padding: 12px 18px;
          text-align: left;
          font-size: 0.88rem;
        }

        .dashboard-table th {
          background-color: var(--muted);
          font-weight: 700;
          color: var(--muted-foreground);
        }

        .dashboard-table tr {
          border-bottom: 1px solid var(--border);
        }

        .dashboard-table tr:last-child {
          border-bottom: none;
        }

        .order-id-cell {
          font-weight: 700;
          color: var(--primary);
        }

        .product-names-cell {
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .text-bold {
          font-weight: 700;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .status-badge.pendiente { background-color: #ffeaa7; color: #d63031; }
        .status-badge.enviado { background-color: #dff9fb; color: #0984e3; }
        .status-badge.entregado { background-color: #dff9fb; color: #27ae60; }

        /* Mis Productos List */
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .empty-state-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4rem 2rem;
          background-color: var(--card);
          border: 1px dashed var(--border);
          border-radius: var(--radius-lg);
          color: var(--muted-foreground);
          gap: 1rem;
        }

        .seller-products-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }

        @media (min-width: 600px) {
          .seller-products-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .seller-products-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .seller-product-card {
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .seller-prod-img {
          height: 160px;
          width: 100%;
          object-fit: cover;
          background-color: var(--muted);
        }

        .seller-prod-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .seller-prod-category {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .seller-prod-title {
          font-family: var(--font-sans);
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .prod-price-stock-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }

        .prod-price-stock-row .label {
          color: var(--muted-foreground);
          display: block;
          font-size: 0.75rem;
        }

        .prod-price-stock-row .value {
          font-weight: 700;
          font-size: 0.95rem;
        }

        .prod-price-stock-row .value.low-stock {
          color: var(--destructive);
        }

        .stock-progress-bar-container {
          height: 6px;
          background-color: var(--muted);
          border-radius: 3px;
          margin-bottom: 1.25rem;
          overflow: hidden;
        }

        .stock-progress-bar {
          height: 100%;
          background-color: var(--primary);
          border-radius: 3px;
        }

        .stock-progress-bar.low {
          background-color: var(--destructive);
        }

        .quick-edit-fields {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: auto;
        }

        .quick-edit-actions {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 0.78rem;
        }

        .quick-edit-btn {
          margin-top: auto;
          padding: 8px 12px;
          font-size: 0.82rem;
        }

        /* Pedidos Recibidos list */
        .tab-hint-txt {
          font-size: 0.82rem;
          color: var(--muted-foreground);
          margin-bottom: 1.5rem;
          margin-top: -0.5rem;
        }

        .seller-orders-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .seller-order-card {
          background-color: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .order-card-header {
          background-color: var(--muted);
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }

        .order-number {
          font-weight: 700;
          color: var(--primary);
        }

        .order-date {
          font-size: 0.8rem;
          color: var(--muted-foreground);
        }

        .order-card-body {
          padding: 1.25rem 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .order-card-body {
            grid-template-columns: 1fr 1fr;
          }
        }

        .buyer-info-col h5, .order-items-col h5 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--muted-foreground);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .buyer-info-col p {
          font-size: 0.85rem;
          margin-bottom: 6px;
        }

        .method-pill {
          background-color: var(--muted);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .order-items-sublist {
          list-style: none;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .order-items-sublist li {
          display: flex;
          justify-content: space-between;
          padding-bottom: 4px;
          border-bottom: 1px dashed var(--border);
        }

        .order-subtotal-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          margin-top: 10px;
        }

        .order-card-footer {
          padding: 12px 20px;
          border-top: 1px solid var(--border);
          background-color: var(--card);
        }

        .status-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--muted-foreground);
        }

        .status-badge-interactive {
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge-interactive:hover {
          filter: brightness(0.9);
        }

        .status-badge-interactive.pendiente { background-color: #ffeaa7; color: #d63031; }
        .status-badge-interactive.enviado { background-color: #dff9fb; color: #0984e3; }
        .status-badge-interactive.entregado { background-color: #dff9fb; color: #27ae60; cursor: default; }

        .status-next-arrow {
          font-size: 0.7rem;
          opacity: 0.8;
        }

        /* Config Form */
        .seller-settings-form {
          max-width: 500px;
          background-color: var(--card);
          border: 1px solid var(--border);
          padding: 2rem;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: var(--shadow-sm);
        }

        /* Form Row Helper */
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .new-product-modal {
          max-width: 550px;
        }
      `}</style>

    </div>
  );
};

export default SellerDashboard;
