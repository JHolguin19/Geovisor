"""
generate_022_urbano_upload.py
─────────────────────────────────────────────────────────────────────────────
Uploads predios_avaluos_urbanos_2026 to Supabase in batches.

Steps:
  1. Upload DDL  (022_urbano_avaluos_ddl.sql)
  2. Read source table from local PostgreSQL in batches of 1000 rows
  3. For each batch: write INSERT SQL → upload via supabase CLI → delete temp file
  4. Upload materialized view (022b_mv_urbano_barrio.sql)

Run from:  C:\\Users\\usuario\\Desktop\\Py2\\hibrido\\App-Alcaldia\\alcaldia-geovisor
"""

import psycopg2
import subprocess
import os
import sys
import tempfile

# ── Config ────────────────────────────────────────────────────────────────────
LOCAL_DB = dict(host='localhost', port=5432, dbname='qgis',
                user='postgres', password='calle71011')

SUPABASE_DIR = os.path.dirname(os.path.abspath(__file__))
MIGRATIONS_DIR = os.path.join(SUPABASE_DIR, 'backend', 'src', 'db', 'migrations')

BATCH_SIZE  = 1000
SOURCE_TBL  = 'Predios_avaluos_urbanos_con_barrio_2026'
TARGET_TBL  = 'public.predios_avaluos_urbanos_2026'
TARGET_COLS = '(id, geom, codigo, barrio, propietario, avaluo_nuevo, avaluo_antiguo, area_predio, area_construida)'

# ── Helpers ───────────────────────────────────────────────────────────────────
def esc(val):
    """Escape a value for SQL literal insertion."""
    if val is None:
        return 'NULL'
    return "'" + str(val).replace("'", "''") + "'"

def num(val):
    if val is None:
        return 'NULL'
    return str(val)

def run_sql_file(path):
    result = subprocess.run(
        ['supabase', 'db', 'query', '--linked', '-f', path],
        cwd=SUPABASE_DIR, capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f'  ERROR:\n{result.stderr.strip()}')
        sys.exit(1)
    if result.stdout.strip():
        print(f'  {result.stdout.strip()[:120]}')

def upload_sql(sql_content, label):
    """Write SQL to a temp file, upload, then delete."""
    fd, tmp_path = tempfile.mkstemp(suffix='.sql', prefix='022_urbano_')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        print(f'  Uploading {label} ({len(sql_content):,} bytes)...', end=' ', flush=True)
        run_sql_file(tmp_path)
        print('OK')
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    # Step 1 — DDL
    ddl_path = os.path.join(MIGRATIONS_DIR, '022_urbano_avaluos_ddl.sql')
    print(f'\n[1/3] Uploading DDL -> {ddl_path}')
    run_sql_file(ddl_path)
    print('  DDL OK')

    # Step 2 — Data batches
    print(f'\n[2/3] Connecting to local PostgreSQL ({SOURCE_TBL})...')
    conn = psycopg2.connect(**LOCAL_DB)
    cur  = conn.cursor()

    cur.execute(f'SELECT COUNT(*) FROM "{SOURCE_TBL}"')
    total = cur.fetchone()[0]
    print(f'  {total:,} records — {(total + BATCH_SIZE - 1) // BATCH_SIZE} batches of {BATCH_SIZE}')

    # Fetch query — rename columns and cast avaluo_nuevo from varchar → numeric
    cur.execute(f"""
        SELECT
            id,
            ST_AsHEXEWKB(geom)  AS geom_hex,
            "CODIGO",
            nombre,
            predialu_3,
            CASE
                WHEN predialu_4 ~ '^[0-9]+(\\.?[0-9]*)$' AND predialu_4::numeric > 0
                THEN predialu_4::numeric
                ELSE NULL
            END AS avaluo_nuevo,
            predialu10,
            "SHAPE_Area",
            predialu_8
        FROM "{SOURCE_TBL}"
        ORDER BY id
    """)

    batch_num  = 1
    buf        = []
    total_done = 0

    def flush(rows, bn):
        lines = [f'INSERT INTO {TARGET_TBL} {TARGET_COLS} VALUES']
        vals  = []
        for r in rows:
            id_, gh, codigo, barrio, prop, av_nuevo, av_ant, area_p, area_c = r
            geom_sql = f"decode('{gh}', 'hex')::geometry" if gh else 'NULL'
            vals.append(
                f"  ({num(id_)}, {geom_sql}, {esc(codigo)}, {esc(barrio)}, "
                f"{esc(prop)}, {num(av_nuevo)}, {num(av_ant)}, "
                f"{num(area_p)}, {num(area_c)})"
            )
        sql = '\n'.join(lines) + '\n' + ',\n'.join(vals) + ';\n'
        upload_sql(sql, f'batch {bn:03d} ({len(rows)} rows)')

    while True:
        row = cur.fetchone()
        if row is None:
            if buf:
                flush(buf, batch_num)
                total_done += len(buf)
            break
        buf.append(row)
        if len(buf) >= BATCH_SIZE:
            flush(buf, batch_num)
            total_done += len(buf)
            buf = []
            batch_num += 1
            print(f'  Progress: {total_done:,}/{total:,} ({100*total_done//total}%)')

    cur.close()
    conn.close()
    print(f'  Done — {total_done:,} rows inserted.')

    # Step 3 — Materialized view
    mv_path = os.path.join(MIGRATIONS_DIR, '022b_mv_urbano_barrio.sql')
    print(f'\n[3/3] Creating materialized view (may take ~60s)...')
    run_sql_file(mv_path)
    print('  Materialized view OK')

    print('\n✓ Migration 022 complete!')

if __name__ == '__main__':
    main()
