import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Estados de Usuario y Tokens
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Estados del Negocio
  const [currency, setCurrency] = useState('BOB'); // BOB por defecto en Bolivia
  const [exchangeRate, setExchangeRate] = useState(6.96);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  // Estados de Modales y Vistas
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [sellerDashOpen, setSellerDashOpen] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  // Cargar perfil del usuario si hay token al iniciar
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token inválido/expirado
          logout();
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  // Cargar tasa de cambio al iniciar
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch(`${API_URL}/exchange-rate`);
        if (res.ok) {
          const data = await res.json();
          setExchangeRate(data.rate);
        }
      } catch (err) {
        console.error('Error al obtener tipo de cambio:', err);
      }
    };
    fetchRate();
  }, []);

  // Persistir carrito y favoritos en localStorage (específicos del usuario para mayor orden)
  useEffect(() => {
    if (user) {
      const storedCart = localStorage.getItem(`cart_${user.email}`);
      const storedWish = localStorage.getItem(`wish_${user.email}`);
      setCart(storedCart ? JSON.parse(storedCart) : []);
      setWishlist(storedWish ? JSON.parse(storedWish) : []);
    } else {
      setCart([]);
      setWishlist([]);
    }
  }, [user]);

  // Guardar carrito en localStorage cuando cambia
  useEffect(() => {
    if (user) {
      localStorage.setItem(`cart_${user.email}`, JSON.stringify(cart));
    }
  }, [cart, user]);

  // Guardar wishlist en localStorage cuando cambia
  useEffect(() => {
    if (user) {
      localStorage.setItem(`wish_${user.email}`, JSON.stringify(wishlist));
    }
  }, [wishlist, user]);

  // Acciones de Auth
  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al iniciar sesión.');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setAuthOpen(false);

    // Si es vendedor, abrir automáticamente panel
    if (data.user.role === 'vendedor') {
      setTimeout(() => {
        setSellerDashOpen(true);
      }, 300);
    }
  };

  const register = async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al registrarse.');
    }

    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    setAuthOpen(false);

    if (data.user.role === 'vendedor') {
      setTimeout(() => {
        setSellerDashOpen(true);
      }, 300);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSellerDashOpen(false);
    setCart([]);
    setWishlist([]);
  };

  // Acciones de Carrito
  const addToCart = (product) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.product.id === productId ? { ...item, qty } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Acciones de Lista de Deseos
  const toggleWishlist = (productId) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setWishlist((prevWish) =>
      prevWish.includes(productId)
        ? prevWish.filter((id) => id !== productId)
        : [...prevWish, productId]
    );
  };

  // Conversión y Formateo de Precios
  const formatPrice = (priceUSD) => {
    if (currency === 'BOB') {
      const priceBOB = Math.round(priceUSD * exchangeRate);
      return `Bs. ${priceBOB}`;
    }
    return `$${priceUSD.toFixed(2)}`;
  };

  const formatPriceSecondary = (priceUSD) => {
    if (currency === 'BOB') {
      return `$${priceUSD.toFixed(2)}`;
    }
    const priceBOB = Math.round(priceUSD * exchangeRate);
    return `Bs. ${priceBOB}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        currency,
        setCurrency,
        exchangeRate,
        cart,
        wishlist,
        authOpen,
        setAuthOpen,
        cartOpen,
        setCartOpen,
        checkoutOpen,
        setCheckoutOpen,
        sellerDashOpen,
        setSellerDashOpen,
        login,
        register,
        logout,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        toggleWishlist,
        formatPrice,
        formatPriceSecondary,
        API_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
