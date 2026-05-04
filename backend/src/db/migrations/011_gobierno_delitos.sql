-- Migración 011: Tabla de delitos reportados por Secretaría de Gobierno
-- Fuente: Policía Nacional / Secretaría de Gobierno, Paz y Convivencia
-- Datos: DELITOS_SANTANDER_2024 y 2025

CREATE TABLE IF NOT EXISTS gobierno_delitos (
  id SERIAL PRIMARY KEY,
  tipo_delito VARCHAR(60) NOT NULL,        -- HOMICIDIO, SECUESTRO, EXTORSION, etc.
  descripcion_conducta TEXT,                -- Artículo del código penal
  anio SMALLINT NOT NULL,                   -- 2024, 2025
  mes VARCHAR(10),                          -- ene, feb, mar...
  fecha_hecho DATE,                         -- Fecha del hecho
  intervalo_hora VARCHAR(20),               -- 00:00-05:59, 06:00-11:59, etc.
  hora_hecho VARCHAR(10),                   -- Hora original
  hora24 SMALLINT,                          -- Hora en formato 24h
  turno VARCHAR(20),                        -- PRIMERO, SEGUNDO, TERCERO, CUARTO
  dia_semana VARCHAR(15),                   -- Lunes, Martes...
  zona VARCHAR(10),                         -- URBANA, RURAL
  barrio_hecho VARCHAR(100),                -- Nombre del barrio (JOIN con barriosurbanos.nombre)
  comuna_zona VARCHAR(100),                 -- Comuna o zona descripción
  arma_medio VARCHAR(60),                   -- Arma o medio utilizado
  modalidad VARCHAR(60),                    -- Modalidad del delito
  movil_agresor VARCHAR(40),                -- Móvil del agresor
  movil_victima VARCHAR(40),                -- Móvil de la víctima
  genero VARCHAR(15),                       -- MASCULINO, FEMENINO
  edad SMALLINT,                            -- Edad de la víctima
  grupo_edad VARCHAR(30),                   -- ADULTOS, MENORES, ADOLESCENTES
  causa_lesion_muerte TEXT,                  -- Causa de lesión o muerte
  clase_sitio VARCHAR(60),                  -- VIAS PUBLICAS, RESIDENCIA, etc.
  clase_bien VARCHAR(60),                   -- Solo para hurtos de celulares
  tipo_bien VARCHAR(60),                    -- Solo para hurtos de celulares
  cantidad SMALLINT DEFAULT 1,              -- Cantidad de intervinientes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_delitos_tipo ON gobierno_delitos(tipo_delito);
CREATE INDEX IF NOT EXISTS idx_delitos_anio ON gobierno_delitos(anio);
CREATE INDEX IF NOT EXISTS idx_delitos_barrio ON gobierno_delitos(barrio_hecho);
CREATE INDEX IF NOT EXISTS idx_delitos_fecha ON gobierno_delitos(fecha_hecho);
CREATE INDEX IF NOT EXISTS idx_delitos_zona ON gobierno_delitos(zona);
CREATE INDEX IF NOT EXISTS idx_delitos_tipo_anio ON gobierno_delitos(tipo_delito, anio);

-- Habilitar RLS
ALTER TABLE gobierno_delitos ENABLE ROW LEVEL SECURITY;

-- Registrar en geo_tablas
INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion)
VALUES ('gobierno_delitos', 'gobierno', 'Delitos reportados en Santander de Quilichao 2024-2025 - Secretaría de Gobierno')
ON CONFLICT (nombre_tabla) DO NOTHING;
