-- =====================================================================
-- Andean Commerce – Esquema de base de datos (PostgreSQL 18)
-- Orden: extensiones -> enums -> tablas -> indices -> triggers -> vistas -> datos semilla
-- =====================================================================

-- ---------------------------------------------------------------------
-- LIMPIEZA TOTAL (en orden inverso de dependencias)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS acciones_admin        CASCADE;
DROP TABLE IF EXISTS reportes              CASCADE;
DROP TABLE IF EXISTS facturas              CASCADE;
DROP TABLE IF EXISTS notificaciones        CASCADE;
DROP TABLE IF EXISTS lista_deseos          CASCADE;
DROP TABLE IF EXISTS resenas               CASCADE;
DROP TABLE IF EXISTS webhooks_pago         CASCADE;
DROP TABLE IF EXISTS detalle_pago_cripto   CASCADE;
DROP TABLE IF EXISTS pagos                 CASCADE;
DROP TABLE IF EXISTS reservas_stock        CASCADE;
DROP TABLE IF EXISTS detalle_pedido        CASCADE;
DROP TABLE IF EXISTS pedidos               CASCADE;
DROP TABLE IF EXISTS imagenes_producto     CASCADE;
DROP TABLE IF EXISTS productos             CASCADE;
DROP TABLE IF EXISTS categorias            CASCADE;
DROP TABLE IF EXISTS perfiles_vendedor     CASCADE;
DROP TABLE IF EXISTS usuarios              CASCADE;

-- Limpiar tipos ENUM si existían
DROP TYPE IF EXISTS estado_reporte     CASCADE;
DROP TYPE IF EXISTS estado_reserva     CASCADE;
DROP TYPE IF EXISTS estado_cripto      CASCADE;
DROP TYPE IF EXISTS red_cripto         CASCADE;
DROP TYPE IF EXISTS moneda_cripto      CASCADE;
DROP TYPE IF EXISTS estado_pago        CASCADE;
DROP TYPE IF EXISTS metodo_pago        CASCADE;
DROP TYPE IF EXISTS moneda_pedido      CASCADE;
DROP TYPE IF EXISTS estado_pedido      CASCADE;
DROP TYPE IF EXISTS estado_producto    CASCADE;
DROP TYPE IF EXISTS rol_usuario        CASCADE;

-- ---------------------------------------------------------------------
-- EXTENSIONES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda difusa sobre texto

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario        AS ENUM ('comprador', 'vendedor', 'admin');
CREATE TYPE estado_producto    AS ENUM ('activo', 'pausado', 'agotado', 'eliminado');
CREATE TYPE estado_pedido      AS ENUM ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado');
CREATE TYPE moneda_pedido      AS ENUM ('BOB', 'USD', 'USDT');
CREATE TYPE metodo_pago        AS ENUM ('tarjeta', 'transferencia', 'cripto', 'efectivo', 'qr', 'delivery');
CREATE TYPE estado_pago        AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');
CREATE TYPE moneda_cripto      AS ENUM ('USDT', 'USDC', 'BTC', 'ETH');
CREATE TYPE red_cripto         AS ENUM ('TRC20', 'ERC20', 'BEP20', 'BTC', 'POLYGON');
CREATE TYPE estado_cripto      AS ENUM ('esperando', 'confirmando', 'confirmado', 'expirado', 'fallido');
CREATE TYPE estado_reserva     AS ENUM ('activa', 'confirmada', 'liberada', 'expirada');
CREATE TYPE estado_reporte     AS ENUM ('pendiente', 'revisado', 'resuelto', 'descartado');

-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(120) NOT NULL,
    email               VARCHAR(160) NOT NULL UNIQUE,
    contrasena_hash     TEXT NOT NULL,
    telefono            VARCHAR(30),
    rol                 rol_usuario NOT NULL DEFAULT 'comprador',
    avatar              VARCHAR(20),               -- iniciales, ej: 'CD'
    avatar_url          TEXT,
    avatar_public_id    VARCHAR(200),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PERFILES_VENDEDOR (extensión 1:1 de usuarios)
-- ---------------------------------------------------------------------
CREATE TABLE perfiles_vendedor (
    usuario_id          UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_tienda       VARCHAR(150) NOT NULL,
    ciudad              VARCHAR(100),
    calificacion_prom   NUMERIC(3,2) NOT NULL DEFAULT 0,
    insignia            VARCHAR(50),
    logo_url            TEXT,
    logo_public_id      VARCHAR(200),
    banner_url          TEXT,
    banner_public_id    VARCHAR(200)
);

-- ---------------------------------------------------------------------
-- CATEGORIAS (auto-referenciada para subcategorías)
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
    id                  SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug                VARCHAR(100) NOT NULL UNIQUE,
    etiqueta            VARCHAR(100) NOT NULL,
    emoji               VARCHAR(10),
    categoria_padre_id  SMALLINT REFERENCES categorias(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- PRODUCTOS
-- ---------------------------------------------------------------------
CREATE TABLE productos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id        SMALLINT REFERENCES categorias(id) ON DELETE SET NULL,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    ubicacion           VARCHAR(150),
    precio_usd          NUMERIC(12,2) NOT NULL CHECK (precio_usd >= 0),
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    insignia            VARCHAR(50),               -- badge del producto, ej: 'Orgánico', 'Más vendido'
    img_url             TEXT,                      -- URL principal de imagen (para compatibilidad frontend)
    estado              estado_producto NOT NULL DEFAULT 'activo',
    calificacion_prom   NUMERIC(3,2) NOT NULL DEFAULT 0,
    num_resenas         INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- IMAGENES_PRODUCTO (para imágenes adicionales / Cloudinary)
-- ---------------------------------------------------------------------
CREATE TABLE imagenes_producto (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id         UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    public_id           VARCHAR(200) NOT NULL,
    secure_url          TEXT NOT NULL,
    formato             VARCHAR(10),
    ancho               INTEGER,
    alto                INTEGER,
    bytes               INTEGER,
    orden               SMALLINT NOT NULL DEFAULT 0,
    es_principal        BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- PEDIDOS
-- ---------------------------------------------------------------------
CREATE TABLE pedidos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comprador_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    numero_pedido       VARCHAR(30) NOT NULL UNIQUE,
    estado              estado_pedido NOT NULL DEFAULT 'pendiente',
    moneda              moneda_pedido NOT NULL DEFAULT 'BOB',
    tasa_cambio         NUMERIC(12,6) NOT NULL DEFAULT 6.96,
    direccion_entrega   TEXT,
    ciudad_entrega      VARCHAR(100),
    nombre_comprador    VARCHAR(120),
    telefono_comprador  VARCHAR(30),
    metodo_pago         metodo_pago,
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    total               NUMERIC(12,2) NOT NULL DEFAULT 0,
    items_json          JSONB,                     -- snapshot del carrito para compatibilidad
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- DETALLE_PEDIDO
-- ---------------------------------------------------------------------
CREATE TABLE detalle_pedido (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id         UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    vendedor_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal            NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- ---------------------------------------------------------------------
-- RESERVAS_STOCK
-- ---------------------------------------------------------------------
CREATE TABLE reservas_stock (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id         UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    detalle_pedido_id   BIGINT NOT NULL REFERENCES detalle_pedido(id) ON DELETE CASCADE,
    cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
    estado              estado_reserva NOT NULL DEFAULT 'activa',
    expira_en           TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PAGOS
-- ---------------------------------------------------------------------
CREATE TABLE pagos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id               UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    metodo                  metodo_pago NOT NULL,
    moneda                  moneda_pedido NOT NULL,
    monto                   NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
    estado                  estado_pago NOT NULL DEFAULT 'pendiente',
    referencia_transaccion  VARCHAR(150),
    pagado_en               TIMESTAMPTZ
);

-- ---------------------------------------------------------------------
-- DETALLE_PAGO_CRIPTO
-- ---------------------------------------------------------------------
CREATE TABLE detalle_pago_cripto (
    pago_id                 UUID PRIMARY KEY REFERENCES pagos(id) ON DELETE CASCADE,
    nowpayments_payment_id  VARCHAR(100) NOT NULL UNIQUE,
    moneda_pago             moneda_cripto NOT NULL,
    red                     red_cripto NOT NULL,
    direccion_pago          TEXT NOT NULL,
    monto_pago              NUMERIC(20,8) NOT NULL,
    monto_pagado_real       NUMERIC(20,8),
    monto_precio_usd        NUMERIC(12,2) NOT NULL,
    estado_cripto           estado_cripto NOT NULL DEFAULT 'esperando'
);

-- ---------------------------------------------------------------------
-- WEBHOOKS_PAGO
-- ---------------------------------------------------------------------
CREATE TABLE webhooks_pago (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pago_id             UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
    payload             JSONB NOT NULL,
    firma_ipn           VARCHAR(200),
    procesado           BOOLEAN NOT NULL DEFAULT false,
    recibido_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- RESEÑAS
-- ---------------------------------------------------------------------
CREATE TABLE resenas (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id         UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    detalle_pedido_id   BIGINT REFERENCES detalle_pedido(id) ON DELETE SET NULL,
    calificacion        SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario          TEXT,
    compra_verificada   BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (detalle_pedido_id)
);

-- ---------------------------------------------------------------------
-- LISTA_DESEOS
-- ---------------------------------------------------------------------
CREATE TABLE lista_deseos (
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_id         UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, producto_id)
);

-- ---------------------------------------------------------------------
-- NOTIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje             TEXT NOT NULL,
    leido               BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- FACTURAS
-- ---------------------------------------------------------------------
CREATE TABLE facturas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    vendedor_id         UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    comprador_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    numero_factura      VARCHAR(30) NOT NULL UNIQUE,
    total               NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    pdf_url             TEXT,
    emitido_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (pedido_id, vendedor_id)
);

-- ---------------------------------------------------------------------
-- REPORTES
-- ---------------------------------------------------------------------
CREATE TABLE reportes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reportante_id           UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_reportado_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_reportado_id   UUID REFERENCES productos(id) ON DELETE CASCADE,
    razon                   VARCHAR(150) NOT NULL,
    descripcion             TEXT,
    estado                  estado_reporte NOT NULL DEFAULT 'pendiente',
    revisado_por            UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (usuario_reportado_id IS NOT NULL OR producto_reportado_id IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- ACCIONES_ADMIN
-- ---------------------------------------------------------------------
CREATE TABLE acciones_admin (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admin_id                UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_accion             VARCHAR(50) NOT NULL,
    usuario_objetivo_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    producto_objetivo_id    UUID REFERENCES productos(id) ON DELETE SET NULL,
    razon                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- ÍNDICES
-- =====================================================================
CREATE INDEX idx_productos_vendedor       ON productos(vendedor_id);
CREATE INDEX idx_productos_categoria      ON productos(categoria_id);
CREATE INDEX idx_productos_estado         ON productos(estado);
CREATE INDEX idx_imagenes_producto        ON imagenes_producto(producto_id);
CREATE INDEX idx_pedidos_comprador        ON pedidos(comprador_id);
CREATE INDEX idx_detalle_pedido_pedido    ON detalle_pedido(pedido_id);
CREATE INDEX idx_detalle_pedido_vendedor  ON detalle_pedido(vendedor_id);
CREATE INDEX idx_reservas_producto        ON reservas_stock(producto_id);
CREATE INDEX idx_reservas_estado_expira   ON reservas_stock(estado, expira_en) WHERE estado = 'activa';
CREATE INDEX idx_pagos_pedido             ON pagos(pedido_id);
CREATE INDEX idx_webhooks_pago            ON webhooks_pago(pago_id);
CREATE INDEX idx_resenas_producto         ON resenas(producto_id);
CREATE INDEX idx_notificaciones_usuario   ON notificaciones(usuario_id) WHERE leido = false;
CREATE INDEX idx_reportes_estado          ON reportes(estado);
CREATE INDEX idx_lista_deseos_usuario     ON lista_deseos(usuario_id);

-- Búsqueda de texto completo en español
CREATE INDEX idx_productos_busqueda ON productos
    USING GIN (to_tsvector('spanish', nombre || ' ' || coalesce(descripcion, '')));

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- 1) Confirmar reserva descuenta stock atómicamente
CREATE OR REPLACE FUNCTION fn_confirmar_reserva_descuenta_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'confirmada' AND OLD.estado IS DISTINCT FROM 'confirmada' THEN
        UPDATE productos
           SET stock = stock - NEW.cantidad
         WHERE id = NEW.producto_id
           AND stock >= NEW.cantidad;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Stock insuficiente para confirmar la reserva %', NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_confirmar_reserva
    BEFORE UPDATE ON reservas_stock
    FOR EACH ROW
    EXECUTE FUNCTION fn_confirmar_reserva_descuenta_stock();

-- 2) Libera reservas expiradas (llamar con pg_cron o job del backend)
CREATE OR REPLACE FUNCTION fn_liberar_reservas_expiradas()
RETURNS void AS $$
BEGIN
    UPDATE reservas_stock
       SET estado = 'expirada'
     WHERE estado = 'activa'
       AND expira_en < now();
END;
$$ LANGUAGE plpgsql;

-- 3) Recalcula calificacion_prom y num_resenas del producto
CREATE OR REPLACE FUNCTION fn_actualizar_calificacion_producto()
RETURNS TRIGGER AS $$
DECLARE
    v_producto_id UUID := COALESCE(NEW.producto_id, OLD.producto_id);
BEGIN
    UPDATE productos p
       SET calificacion_prom = COALESCE(sub.promedio, 0),
           num_resenas       = COALESCE(sub.total, 0)
      FROM (
            SELECT AVG(calificacion)::NUMERIC(3,2) AS promedio, COUNT(*) AS total
              FROM resenas
             WHERE producto_id = v_producto_id
           ) sub
     WHERE p.id = v_producto_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_resenas_insert
    AFTER INSERT ON resenas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_calificacion_producto();

CREATE TRIGGER trg_resenas_update
    AFTER UPDATE ON resenas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_calificacion_producto();

CREATE TRIGGER trg_resenas_delete
    AFTER DELETE ON resenas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_calificacion_producto();

-- 4) Recalcula calificacion_prom del vendedor
CREATE OR REPLACE FUNCTION fn_actualizar_calificacion_vendedor()
RETURNS TRIGGER AS $$
DECLARE
    v_vendedor_id UUID;
BEGIN
    SELECT vendedor_id INTO v_vendedor_id
      FROM productos
     WHERE id = COALESCE(NEW.producto_id, OLD.producto_id);

    UPDATE perfiles_vendedor pv
       SET calificacion_prom = COALESCE(sub.promedio, 0)
      FROM (
            SELECT AVG(r.calificacion)::NUMERIC(3,2) AS promedio
              FROM resenas r
              JOIN productos p ON p.id = r.producto_id
             WHERE p.vendedor_id = v_vendedor_id
           ) sub
     WHERE pv.usuario_id = v_vendedor_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calificacion_vendedor
    AFTER INSERT OR UPDATE OR DELETE ON resenas
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_calificacion_vendedor();

-- =====================================================================
-- VISTAS
-- =====================================================================

-- Alerta de stock bajo (umbral: 5 unidades)
CREATE OR REPLACE VIEW vista_stock_bajo AS
SELECT id, vendedor_id, nombre, stock
  FROM productos
 WHERE estado = 'activo'
   AND stock <= 5
 ORDER BY stock ASC;

-- Vista de catálogo público (devuelve columnas con nombres compatibles con el frontend)
CREATE OR REPLACE VIEW vista_catalogo AS
SELECT
    p.id,
    c.slug          AS category,
    p.nombre        AS name,
    pv.nombre_tienda AS seller,
    p.vendedor_id   AS "sellerId",
    p.ubicacion     AS location,
    p.precio_usd    AS "priceUSD",
    p.calificacion_prom AS rating,
    p.num_resenas   AS reviews,
    p.stock,
    p.insignia      AS badge,
    p.img_url       AS img,
    p.descripcion   AS description,
    p.estado,
    p.created_at
FROM productos p
JOIN usuarios u       ON u.id = p.vendedor_id
JOIN perfiles_vendedor pv ON pv.usuario_id = p.vendedor_id
LEFT JOIN categorias c ON c.id = p.categoria_id
WHERE p.estado = 'activo';

-- =====================================================================
-- DATOS SEMILLA (Categorías)
-- =====================================================================
INSERT INTO categorias (slug, etiqueta, emoji) VALUES
('artesanal',  'Artesanías',   '🎨'),
('alimentos',  'Alimentos',    '🥬'),
('ropa',       'Ropa & Moda',  '👗'),
('electronica','Electrónica',  '📱'),
('hogar',      'Hogar',        '🏠'),
('belleza',    'Belleza',      '✨');

-- =====================================================================
-- DATOS SEMILLA (Usuarios demo)
-- Contraseña para ambas cuentas: demo123
-- Hash generado con bcrypt rounds=10
-- =====================================================================
INSERT INTO usuarios (id, nombre, email, contrasena_hash, telefono, rol, avatar) VALUES
(
  'aaaaaaaa-0001-0001-0001-000000000001',
  'Cliente Demo',
  'cliente@demo.bo',
  '$2b$10$/wnMlkLMyeMRq.DuFvNaY.Firfvm2AxERxhQvIgQ25RUmmgkN0ym.',
  '71234567',
  'comprador',
  'CD'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  'Vendedor Demo',
  'vendedor@demo.bo',
  '$2b$10$/wnMlkLMyeMRq.DuFvNaY.Firfvm2AxERxhQvIgQ25RUmmgkN0ym.',
  '79876543',
  'vendedor',
  'AM'
);

-- Perfil de la tienda del vendedor demo
INSERT INTO perfiles_vendedor (usuario_id, nombre_tienda, ciudad) VALUES
('aaaaaaaa-0002-0002-0002-000000000002', 'Artesanías Mamani', 'Cochabamba');

-- =====================================================================
-- DATOS SEMILLA (Productos demo)
-- =====================================================================
INSERT INTO productos
  (vendedor_id, categoria_id, nombre, descripcion, ubicacion, precio_usd, stock, insignia, img_url)
VALUES
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'artesanal'),
  'Chulo de Lana de Alpaca',
  'Gorro tradicional andino tejido a mano con 100% lana de alpaca. Muy abrigado y suave, ideal para climas fríos.',
  'La Paz', 15.00, 30, 'Hecho a mano',
  'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'artesanal'),
  'Vasija de Cerámica Pintada',
  'Vasija de barro moldeada a mano y pintada con motivos iconográficos de las culturas de los valles bolivianos.',
  'Cochabamba', 22.00, 12, 'Artesanal',
  'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'alimentos'),
  'Quinua Real Orgánica (1kg)',
  'Quinua real de grano grande, cultivada de forma orgánica y sostenible en el altiplano sur de Bolivia (Uyuni).',
  'Oruro', 8.00, 50, 'Orgánico',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'alimentos'),
  'Café de los Yungas (250g)',
  'Café de especialidad de origen único, cultivado a gran altura en los Yungas paceños. Notas de chocolate y frutas rojas.',
  'La Paz', 12.00, 40, 'Más vendido',
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'ropa'),
  'Poncho Tradicional de Alpaca',
  'Poncho andino de lana de alpaca premium con patrones geométricos tradicionales. Elegante, abrigado y de gran durabilidad.',
  'Potosí', 45.00, 8, 'Destacado',
  'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'electronica'),
  'Cargador Solar Portátil 10000mAh',
  'Powerbank con panel solar integrado. Resistente al agua y polvo, perfecto para viajes de aventura por Bolivia.',
  'Santa Cruz', 30.00, 25, NULL,
  'https://images.unsplash.com/photo-1609592424085-f5b2157b6f38?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'hogar'),
  'Cojín Tejido con Diseños Nativos',
  'Funda de cojín tejida en telar tradicional con hilos teñidos naturalmente. Aporta un toque andino y colorido a tu sala.',
  'Sucre', 18.00, 15, NULL,
  'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&q=80&w=400'
),
(
  'aaaaaaaa-0002-0002-0002-000000000002',
  (SELECT id FROM categorias WHERE slug = 'belleza'),
  'Aceite de Coco Extra Virgen (500ml)',
  'Aceite de coco 100% puro y prensado en frío, elaborado de manera sostenible en las regiones tropicales del Beni.',
  'Trinidad', 10.00, 60, 'Natural',
  'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&q=80&w=400'
);
