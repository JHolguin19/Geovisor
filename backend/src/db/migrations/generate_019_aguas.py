"""
Genera migration SQL para las capas de Aguas y Saneamiento Básico.
Exporta desde la BD local QGIS y produce:
  - 019_aguas_acueductos.sql       (DDL + índices + RLS + geo_tablas)
  - 019b_aguas_veredas_data.sql    (datos de veredas en lotes de 20)
  - 019c_aguas_red_data.sql        (datos de red en lotes de 30)
  - 019d_aguas_estructura_data.sql (datos de estructuras en lotes de 40)

Uso:
  python generate_019_aguas.py
  supabase db query --linked -f 019_aguas_acueductos.sql
  supabase db query --linked -f 019b_aguas_veredas_data.sql
  supabase db query --linked -f 019c_aguas_red_data.sql
  supabase db query --linked -f 019d_aguas_estructura_data.sql
"""

import psycopg2
import os
import sys

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'dbname': 'qgis',
    'user': 'postgres',
    'password': 'calle71011',
}

MIGRATION_DIR = os.path.dirname(os.path.abspath(__file__))


def esc(v):
    """Escapa valores para SQL."""
    if v is None:
        return 'NULL'
    s = str(v).replace("'", "''")
    return f"'{s}'"


def connect():
    return psycopg2.connect(**DB_CONFIG)


def write_ddl(conn):
    """Genera el archivo DDL (019_aguas_acueductos.sql)."""
    path = os.path.join(MIGRATION_DIR, '019_aguas_acueductos.sql')

    sql = """\
-- ============================================================
-- Migración 019 — Dirección de Aguas y Saneamiento Básico
-- Capas: veredas_acueductos, redAcueducto, estructura_acueducto
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 1. TABLA: planeacion_aguas_veredas_acueductos
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.planeacion_aguas_veredas_acueductos;
CREATE TABLE public.planeacion_aguas_veredas_acueductos (
    id               SERIAL PRIMARY KEY,
    geom             geometry(MultiPolygon, 4326),
    "VEREDA"         VARCHAR,
    "SISTEMA_ACUEDUCTO" VARCHAR,
    "NOMBRE_ACUEDUCTO"  VARCHAR
);

CREATE INDEX idx_aguas_veredas_geom
    ON public.planeacion_aguas_veredas_acueductos USING GIST(geom);
CREATE INDEX idx_aguas_veredas_sistema
    ON public.planeacion_aguas_veredas_acueductos("SISTEMA_ACUEDUCTO");
CREATE INDEX idx_aguas_veredas_vereda
    ON public.planeacion_aguas_veredas_acueductos("VEREDA");

ALTER TABLE public.planeacion_aguas_veredas_acueductos ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 2. TABLA: planeacion_aguas_redAcueducto
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public."planeacion_aguas_redAcueducto";
CREATE TABLE public."planeacion_aguas_redAcueducto" (
    id          VARCHAR PRIMARY KEY,
    geom        geometry(LineString, 4326),
    "Name"      VARCHAR,
    descriptio  VARCHAR,
    layer       VARCHAR,
    "Longitud"  DOUBLE PRECISION
);

CREATE INDEX idx_aguas_red_geom
    ON public."planeacion_aguas_redAcueducto" USING GIST(geom);

ALTER TABLE public."planeacion_aguas_redAcueducto" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 3. TABLA: planeacion_aguas_estructura_acueducto
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.planeacion_aguas_estructura_acueducto;
CREATE TABLE public.planeacion_aguas_estructura_acueducto (
    id          VARCHAR PRIMARY KEY,
    geom        geometry(Point, 4326),
    "Name"      VARCHAR,
    descriptio  VARCHAR,
    layer       VARCHAR
);

CREATE INDEX idx_aguas_estructura_geom
    ON public.planeacion_aguas_estructura_acueducto USING GIST(geom);

ALTER TABLE public.planeacion_aguas_estructura_acueducto ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 4. Registrar en geo_tablas
-- ─────────────────────────────────────────────
DELETE FROM public.geo_tablas
WHERE nombre_tabla IN (
    'planeacion_aguas_veredas_acueductos',
    'planeacion_aguas_redAcueducto',
    'planeacion_aguas_estructura_acueducto'
);

INSERT INTO public.geo_tablas (nombre_tabla, descripcion, secretaria_id, geom_column, srid)
VALUES
    ('planeacion_aguas_veredas_acueductos',
     'Veredas con sistemas de acueducto rural',
     'aguas', 'geom', 4326),
    ('planeacion_aguas_redAcueducto',
     'Red de acueducto rural — líneas de conducción',
     'aguas', 'geom', 4326),
    ('planeacion_aguas_estructura_acueducto',
     'Estructuras de acueducto: bocatomas, tanques, desarenadores',
     'aguas', 'geom', 4326);

COMMIT;
"""

    with open(path, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f'[OK] Creado: {os.path.basename(path)}')


def write_veredas_data(conn):
    """Genera 019b_aguas_veredas_data.sql con inserts de veredas (lotes 20)."""
    path = os.path.join(MIGRATION_DIR, '019b_aguas_veredas_data.sql')
    cur = conn.cursor()
    cur.execute("""
        SELECT
            ST_AsText(geom),
            "VEREDA",
            "SISTEMA_ACUEDUCTO",
            "NOMBRE_ACUEDUCTO"
        FROM public.planeacion_aguas_veredas_acueductos
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    batch_size = 20
    lines = ['-- 019b: Datos de veredas_acueductos\nBEGIN;\n']
    for i, (geom_wkt, vereda, sistema, nombre) in enumerate(rows):
        geom_sql = f"ST_SetSRID(ST_GeomFromText({esc(geom_wkt)}), 4326)" if geom_wkt else 'NULL'
        lines.append(
            f"INSERT INTO public.planeacion_aguas_veredas_acueductos "
            f"(geom, \"VEREDA\", \"SISTEMA_ACUEDUCTO\", \"NOMBRE_ACUEDUCTO\") "
            f"VALUES ({geom_sql}, {esc(vereda)}, {esc(sistema)}, {esc(nombre)});"
        )
        if (i + 1) % batch_size == 0:
            lines.append('\nCOMMIT;\nBEGIN;\n')

    lines.append('\nCOMMIT;\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'[OK] Creado: {os.path.basename(path)} ({len(rows)} filas)')


def write_red_data(conn):
    """Genera 019c_aguas_red_data.sql con inserts de la red de acueducto."""
    path = os.path.join(MIGRATION_DIR, '019c_aguas_red_data.sql')
    cur = conn.cursor()
    cur.execute("""
        SELECT
            id,
            ST_AsText(ST_Force2D(geom)),
            "Name",
            descriptio,
            layer,
            "Longitud"
        FROM public."planeacion_aguas_redAcueducto"
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    batch_size = 30
    lines = ['-- 019c: Datos de planeacion_aguas_redAcueducto\nBEGIN;\n']
    for i, (rid, geom_wkt, name, desc, lay, long) in enumerate(rows):
        geom_sql = f"ST_SetSRID(ST_GeomFromText({esc(geom_wkt)}), 4326)" if geom_wkt else 'NULL'
        long_sql = str(long) if long is not None else 'NULL'
        lines.append(
            f"INSERT INTO public.\"planeacion_aguas_redAcueducto\" "
            f"(id, geom, \"Name\", descriptio, layer, \"Longitud\") "
            f"VALUES ({esc(rid)}, {geom_sql}, {esc(name)}, {esc(desc)}, {esc(lay)}, {long_sql}) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
        if (i + 1) % batch_size == 0:
            lines.append('\nCOMMIT;\nBEGIN;\n')

    lines.append('\nCOMMIT;\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'[OK] Creado: {os.path.basename(path)} ({len(rows)} filas)')


def write_estructura_data(conn):
    """Genera 019d_aguas_estructura_data.sql con inserts de estructuras."""
    path = os.path.join(MIGRATION_DIR, '019d_aguas_estructura_data.sql')
    cur = conn.cursor()
    cur.execute("""
        SELECT
            id,
            ST_AsText(ST_Force2D(geom)),
            "Name",
            descriptio,
            layer
        FROM public.planeacion_aguas_estructura_acueducto
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    batch_size = 40
    lines = ['-- 019d: Datos de planeacion_aguas_estructura_acueducto\nBEGIN;\n']
    for i, (rid, geom_wkt, name, desc, lay) in enumerate(rows):
        geom_sql = f"ST_SetSRID(ST_GeomFromText({esc(geom_wkt)}), 4326)" if geom_wkt else 'NULL'
        lines.append(
            f"INSERT INTO public.planeacion_aguas_estructura_acueducto "
            f"(id, geom, \"Name\", descriptio, layer) "
            f"VALUES ({esc(rid)}, {geom_sql}, {esc(name)}, {esc(desc)}, {esc(lay)}) "
            f"ON CONFLICT (id) DO NOTHING;"
        )
        if (i + 1) % batch_size == 0:
            lines.append('\nCOMMIT;\nBEGIN;\n')

    lines.append('\nCOMMIT;\n')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'[OK] Creado: {os.path.basename(path)} ({len(rows)} filas)')


def main():
    print('Conectando a BD local...')
    try:
        conn = connect()
    except Exception as e:
        print(f'[ERROR] No se pudo conectar: {e}')
        sys.exit(1)

    write_ddl(conn)
    write_veredas_data(conn)
    write_red_data(conn)
    write_estructura_data(conn)
    conn.close()

    print('\n=== Listo! Aplica en Supabase con: ===')
    print('supabase db query --linked -f 019_aguas_acueductos.sql')
    print('supabase db query --linked -f 019b_aguas_veredas_data.sql')
    print('supabase db query --linked -f 019c_aguas_red_data.sql')
    print('supabase db query --linked -f 019d_aguas_estructura_data.sql')


if __name__ == '__main__':
    main()
