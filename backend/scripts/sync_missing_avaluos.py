"""
Sync missing properties from QGIS PostgreSQL → Supabase.
Inserts with excluir_analisis = true so they appear on the map
but are excluded from analytics/metrics.
"""
import subprocess, json, sys, os, tempfile

PSQL = r'C:\Program Files\PostgreSQL\17\bin\psql.exe'
QGIS_CONN = "host=localhost port=5432 dbname=qgis user=postgres password=calle71011"
QGIS_TABLE = '"Planeacion_zonarural2025_actualizados_avaluos"'
SUPA_TABLE = "planeacion_zonarural2025_avaluos"
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BATCH_SIZE = 25  # smaller batches to keep SQL size manageable

def run_qgis_query(sql):
    result = subprocess.run(
        [PSQL, QGIS_CONN, '-t', '-A', '-F', '\t', '-c', sql],
        capture_output=True, text=True, encoding='utf-8'
    )
    if result.returncode != 0:
        print(f"QGIS query error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
    return lines

def run_supabase_sql_file(sql):
    """Write SQL to temp file, then run via supabase db query --linked --file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False, encoding='utf-8') as f:
        f.write(sql)
        tmp_path = f.name
    try:
        result = subprocess.run(
            ['supabase', 'db', 'query', '--linked', '--file', tmp_path],
            capture_output=True, text=True, encoding='utf-8',
            cwd=PROJECT_DIR
        )
        if result.returncode != 0:
            print(f"Supabase error: {result.stderr}", file=sys.stderr)
            return None
        try:
            data = json.loads(result.stdout)
            return data.get('rows', [])
        except:
            return []
    finally:
        os.unlink(tmp_path)

def run_supabase_query(sql):
    """For short queries, pass directly"""
    result = subprocess.run(
        ['supabase', 'db', 'query', '--linked', sql],
        capture_output=True, text=True, encoding='utf-8',
        cwd=PROJECT_DIR
    )
    if result.returncode != 0:
        print(f"Supabase error: {result.stderr}", file=sys.stderr)
        return None
    try:
        data = json.loads(result.stdout)
        return data.get('rows', [])
    except:
        return []

# 1. Get codigos already in Supabase
print("[1/4] Fetching Supabase codigos...")
supa_rows = run_supabase_query(f"SELECT DISTINCT codigo FROM {SUPA_TABLE}")
supa_codigos = {r['codigo'] for r in supa_rows}
print(f"       Supabase has {len(supa_codigos)} unique codigos")

# 2. Get deduplicated QGIS codigos
print("[2/4] Fetching QGIS codigos...")
qgis_lines = run_qgis_query(f'SELECT DISTINCT "CODIGO" FROM {QGIS_TABLE}')
qgis_codigos = {l.strip() for l in qgis_lines if l.strip()}
print(f"       QGIS has {len(qgis_codigos)} unique codigos")

missing = qgis_codigos - supa_codigos
print(f"       Missing from Supabase: {len(missing)}")

if not missing:
    print("Nothing to sync!")
    sys.exit(0)

# 3. Get max ID
print("[3/4] Getting max ID from Supabase...")
max_id_rows = run_supabase_query(f"SELECT COALESCE(MAX(id), 0) AS max_id FROM {SUPA_TABLE}")
next_id = int(max_id_rows[0]['max_id']) + 1
print(f"       Next ID: {next_id}")

# 4. Extract missing rows from QGIS (deduplicated) and insert via temp files
print(f"[4/4] Extracting & inserting {len(missing)} properties in batches of {BATCH_SIZE}...")

missing_list = sorted(missing)
total_inserted = 0
errors = 0

for batch_start in range(0, len(missing_list), BATCH_SIZE):
    batch = missing_list[batch_start:batch_start + BATCH_SIZE]
    in_clause = ",".join(f"'{c}'" for c in batch)

    extract_sql = f"""
    SELECT DISTINCT ON ("CODIGO")
        ST_AsText(geom) AS geom_wkt,
        "CODIGO",
        "VEREDA_COD",
        nombre,
        matricula,
        propietario,
        avaluo_nuevo,
        avaluo_antiguo,
        area_construida,
        area_predio,
        area_hecta
    FROM {QGIS_TABLE}
    WHERE "CODIGO" IN ({in_clause})
    ORDER BY "CODIGO", id
    """

    rows = run_qgis_query(extract_sql)
    if not rows:
        continue

    values_parts = []
    for row in rows:
        cols = row.split('\t')
        if len(cols) < 11:
            continue

        geom_wkt = cols[0].replace("'", "''") if cols[0] else ''
        codigo = cols[1].replace("'", "''") if cols[1] else ''
        vereda_cod = cols[2].replace("'", "''") if cols[2] else ''
        nombre_val = cols[3].replace("'", "''") if cols[3] else ''
        matricula_val = cols[4].replace("'", "''") if cols[4] else ''
        propietario_val = cols[5].replace("'", "''") if cols[5] else ''
        avaluo_nuevo = cols[6] if cols[6] and cols[6] != '' else 'NULL'
        avaluo_antiguo = cols[7] if cols[7] and cols[7] != '' else 'NULL'
        area_construida = cols[8] if cols[8] and cols[8] != '' else 'NULL'
        area_predio_val = cols[9] if cols[9] and cols[9] != '' else 'NULL'
        area_hecta_val = cols[10] if cols[10] and cols[10] != '' else 'NULL'

        geom_sql = f"ST_GeomFromText('{geom_wkt}', 4326)" if geom_wkt and geom_wkt != '' else 'NULL'

        values_parts.append(
            f"({next_id}, {geom_sql}, "
            f"'{codigo}', '{vereda_cod}', '{nombre_val}', '{matricula_val}', "
            f"'{propietario_val}', "
            f"{avaluo_nuevo}, {avaluo_antiguo}, "
            f"{area_construida}, {area_predio_val}, {area_hecta_val}, "
            f"true)"
        )
        next_id += 1

    if not values_parts:
        continue

    insert_sql = f"""
    INSERT INTO {SUPA_TABLE}
        (id, geom, codigo, vereda_cod, nombre, matricula, propietario,
         avaluo_nuevo, avaluo_antiguo, area_construida, area_predio, area_hecta,
         excluir_analisis)
    VALUES {','.join(values_parts)}
    ON CONFLICT (id) DO NOTHING;
    """

    result = run_supabase_sql_file(insert_sql)
    if result is not None:
        total_inserted += len(values_parts)
        print(f"       Batch {batch_start // BATCH_SIZE + 1}: inserted {len(values_parts)} rows (total: {total_inserted})")
    else:
        errors += 1
        print(f"       Batch {batch_start // BATCH_SIZE + 1}: FAILED")

print(f"\nDone! Inserted {total_inserted} properties with excluir_analisis = true")
if errors:
    print(f"WARNING: {errors} batches failed")
