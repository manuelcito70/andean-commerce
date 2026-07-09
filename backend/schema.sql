-- Eliminar tablas si existen (en orden inverso de dependencias)
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Crear Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('cliente', 'vendedor')),
    store_name VARCHAR(100),
    city VARCHAR(50),
    avatar VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear Tabla de Productos
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('artesanal', 'alimentos', 'ropa', 'electronica', 'hogar', 'belleza')),
    name VARCHAR(255) NOT NULL,
    seller VARCHAR(100) NOT NULL,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    location VARCHAR(50) NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    reviews INTEGER DEFAULT 0,
    stock INTEGER NOT NULL,
    badge VARCHAR(50),
    img TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear Tabla de Pedidos
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    buyer_name VARCHAR(100) NOT NULL,
    buyer_phone VARCHAR(20) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_city VARCHAR(50) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'BOB')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('qr', 'card', 'delivery')),
    total_usd DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Enviado', 'Entregado')),
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear Tabla de Lista de Deseos (Favoritos)
CREATE TABLE wishlists (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
);

-- Insertar Cuentas de Prueba (Contraseña encriptada para 'demo123' es '$2b$10$/wnMlkLMyeMRq.DuFvNaY.Firfvm2AxERxhQvIgQ25RUmmgkN0ym.')
INSERT INTO users (name, email, password, phone, role, store_name, city, avatar) VALUES
('Cliente Demo', 'cliente@demo.bo', '$2b$10$/wnMlkLMyeMRq.DuFvNaY.Firfvm2AxERxhQvIgQ25RUmmgkN0ym.', '71234567', 'cliente', NULL, 'La Paz', 'CD'),
('Vendedor Demo', 'vendedor@demo.bo', '$2b$10$/wnMlkLMyeMRq.DuFvNaY.Firfvm2AxERxhQvIgQ25RUmmgkN0ym.', '79876543', 'vendedor', 'Artesanías Mamani', 'Cochabamba', 'AM');

-- Insertar Productos Semilla
-- El seller_id del vendedor demo insertado arriba será 2 (puesto que es el segundo insertado)
INSERT INTO products (category, name, seller, seller_id, location, price_usd, rating, reviews, stock, badge, img, description) VALUES
('artesanal', 'Chulo de Lana de Alpaca', 'Artesanías Mamani', 2, 'La Paz', 15.00, 4.8, 12, 30, 'Hecho a mano', 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&q=80&w=400', 'Gorro tradicional andino tejido a mano con 100% lana de alpaca. Muy abrigado y suave, ideal para climas fríos.'),
('artesanal', 'Vasija de Cerámica Pintada', 'Artesanías Mamani', 2, 'Cochabamba', 22.00, 4.5, 8, 12, 'Artesanal', 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&q=80&w=400', 'Vasija de barro moldeada a mano y pintada con motivos iconográficos de las culturas de los valles bolivianos.'),
('alimentos', 'Quinua Real Orgánica (1kg)', 'Artesanías Mamani', 2, 'Oruro', 8.00, 4.9, 25, 50, 'Orgánico', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400', 'Quinua real de grano grande, cultivada de forma orgánica y sostenible en el altiplano sur de Bolivia (Uyuni).'),
('alimentos', 'Café de los Yungas (250g)', 'Artesanías Mamani', 2, 'La Paz', 12.00, 4.7, 19, 40, 'Más vendido', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400', 'Café de especialidad de origen único, cultivado a gran altura en los Yungas paceños. Notas de chocolate y frutas rojas.'),
('ropa', 'Poncho Tradicional de Alpaca', 'Artesanías Mamani', 2, 'Potosí', 45.00, 4.9, 15, 8, 'Destacado', 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=400', 'Poncho andino de lana de alpaca premium con patrones geométricos tradicionales. Elegante, abrigado y de gran durabilidad.'),
('electronica', 'Cargador Solar Portátil 10000mAh', 'Artesanías Mamani', 2, 'Santa Cruz', 30.00, 4.2, 5, 25, NULL, 'https://images.unsplash.com/photo-1609592424085-f5b2157b6f38?auto=format&fit=crop&q=80&w=400', 'Powerbank con panel solar integrado. Resistente al agua y polvo, perfecto para viajes de aventura por Bolivia.'),
('hogar', 'Cojín Tejido con Diseños Nativos', 'Artesanías Mamani', 2, 'Sucre', 18.00, 4.6, 9, 15, NULL, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=400', 'Funda de cojín tejida en telar tradicional con hilos teñidos naturalmente. Aporta un toque andino y colorido a tu sala.'),
('belleza', 'Aceite de Coco Extra Virgen (500ml)', 'Artesanías Mamani', 2, 'Trinidad', 10.00, 4.7, 14, 60, 'Natural', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=400', 'Aceite de coco 100% puro y prensado en frío, elaborado de manera sostenible en las regiones tropicales del Beni.');
