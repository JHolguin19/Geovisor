#!/usr/bin/env python3
"""
generate_008_migration.py
Reads pdm_limpio.csv and generates SQL migration 008_reload_pdm_metas_csv.sql
"""

import csv
import json
import os
import sys
from decimal import Decimal, InvalidOperation

CSV_PATH = os.path.join(os.path.dirname(__file__), "pdm_limpio.csv")
SQL_OUTPUT = os.path.join(
    os.path.dirname(__file__),
    "backend", "src", "db", "migrations",
    "008_reload_pdm_metas_csv.sql"
)

HEADER = """\
-- 008_reload_pdm_metas_csv.sql
-- PDM data reload from pdm_limpio.csv
-- Generated: 2026-04-23
-- Source: pdm_limpio.csv (733 metas)

TRUNCATE TABLE pdm_metas RESTART IDENTITY;

INSERT INTO pdm_metas (
  meta_num, cod_dependencia, num_pilar, nom_pilar, macrometa,
  cod_sector, nom_sector, cod_programa, nombre_programa, cod_bpin,
  acciones_plan, unidad_medida, linea_base, anio_base, codigo_producto,
  indicador_meta, secretaria, descripcion_meta, meta_cuatrienio, tipo_ponderado,
  meta_pdm_2024, meta_fisica_2024, meta_pdm_2025, meta_fisica_2025,
  meta_pdm_2026, meta_fisica_2026, meta_pdm_2027, meta_fisica_2027,
  presupuesto_2024, presupuesto_2025, presupuesto_2026, presupuesto_2027,
  avance_fisico, cumplimiento_cuatrienio, ponderado_cuatrienio,
  eficiencia_2024, eficiencia_2025, eficiencia_2026, eficiencia_2027,
  ponderado_avance_2024, ponderado_avance_2025, ponderado_avance_2026, ponderado_avance_2027,
  observaciones_2024, compromisos_2024, observaciones_2025, compromisos_2025,
  observaciones_2026, compromisos_2026, observaciones_2027, compromisos_2027
) VALUES
"""


def is_null_val(v):
    """Return True if the value should be treated as SQL NULL."""
    if v is None:
        return True
    s = str(v).strip()
    # Excel error values → NULL
    if s.startswith("#") and ("!" in s or "?" in s or "/" in s):
        return True
    return s in ("", "NP", "ND", "-", "nan", "NaN", "NULL", "N/A", "n/a", "$ -", "$-", "-")


def clean_numeric(v):
    """
    Convert a messy numeric string to a Python float or None.
    Handles:  "44.194.000,00"  "$ 44.194.000,00"  "100%"  "44194000.0"  "1,130.00"
    Returns float or None.
    """
    if is_null_val(v):
        return None
    s = str(v).strip()

    # Strip leading $ and spaces
    s = s.replace("$", "").strip()

    # Strip trailing %
    pct = s.endswith("%")
    if pct:
        s = s[:-1].strip()

    # Detect format: if there are dots and commas we need to figure out which is decimal sep
    # Format A: "44.194.000,00"  → dots are thousands, comma is decimal
    # Format B: "44194000.0"     → dot is decimal (plain float string)
    # Format C: "1,130.00"       → comma is thousands, dot is decimal
    # Format D: "100"            → plain int

    # Remove all whitespace
    s = s.replace(" ", "")

    if s in ("", "-"):
        return None

    # Try direct float first (handles "44194000.0", "100", "0.01", etc.)
    try:
        result = float(s)
        if pct:
            result = result / 100.0
        return result
    except ValueError:
        pass

    # Format A: multiple dots + comma → "44.194.000,00"
    if s.count(".") > 1 and "," in s:
        # dots = thousands sep, comma = decimal sep
        s2 = s.replace(".", "").replace(",", ".")
        try:
            result = float(s2)
            if pct:
                result = result / 100.0
            return result
        except ValueError:
            pass

    # Format A variant: "44.194.000" (no decimal part)
    if s.count(".") > 1 and "," not in s:
        s2 = s.replace(".", "")
        try:
            result = float(s2)
            if pct:
                result = result / 100.0
            return result
        except ValueError:
            pass

    # Format C: "1,130.00" or "$558,984,000" → comma thousands, dot decimal
    # Also handles negative like "-$15,141,000" (already stripped $ above)
    if "," in s and "." in s:
        # comma before dot → comma is thousands
        ci = s.index(",")
        di = s.index(".")
        if ci < di:
            s2 = s.replace(",", "")
            try:
                result = float(s2)
                if pct:
                    result = result / 100.0
                return result
            except ValueError:
                pass
        else:
            # dot before comma → dot is thousands, comma is decimal (European)
            s2 = s.replace(".", "").replace(",", ".")
            try:
                result = float(s2)
                if pct:
                    result = result / 100.0
                return result
            except ValueError:
                pass

    # Format: only comma, no dot → "0,01" (decimal) or "1,130" / "$558,984,000" (thousands)
    if "," in s and "." not in s:
        comma_count = s.count(",")
        # If multiple commas → definitely thousands separator (e.g., "$558,984,000")
        # If single comma → ambiguous: check if the part after the comma has 3 digits → thousands
        if comma_count > 1:
            # Treat as thousands separator
            s2 = s.replace(",", "")
            try:
                result = float(s2)
                if pct:
                    result = result / 100.0
                return result
            except ValueError:
                pass
        else:
            # Single comma: check digits after comma
            parts = s.split(",")
            after_comma = parts[-1].lstrip("-")
            if len(after_comma) == 3 and after_comma.isdigit():
                # e.g., "1,130" → thousands separator
                s2 = s.replace(",", "")
                try:
                    result = float(s2)
                    if pct:
                        result = result / 100.0
                    return result
                except ValueError:
                    pass
            else:
                # Treat as decimal separator: "0,01" → 0.01, "31,328" → 31.328
                s2 = s.replace(",", ".")
                try:
                    result = float(s2)
                    if pct:
                        result = result / 100.0
                    return result
                except ValueError:
                    pass

    print(f"  [WARN] Could not parse numeric: {repr(v)}", file=sys.stderr)
    return None


def clean_integer(v):
    """Convert to integer or None."""
    if is_null_val(v):
        return None
    n = clean_numeric(v)
    if n is None:
        return None
    return int(round(n))


def clean_text(v):
    """Return stripped text or None if empty."""
    if is_null_val(v):
        return None
    s = str(v).strip()
    if not s:
        return None
    return s


def sql_val_text(v):
    """Format a text value for SQL: NULL or 'escaped string'."""
    t = clean_text(v)
    if t is None:
        return "NULL"
    escaped = t.replace("'", "''")
    return f"'{escaped}'"


def sql_val_int(v):
    """Format an integer value for SQL: NULL or integer."""
    n = clean_integer(v)
    if n is None:
        return "NULL"
    return str(n)


def sql_val_numeric(v):
    """Format a numeric value for SQL: NULL or number."""
    if is_null_val(v):
        return "NULL"
    n = clean_numeric(v)
    if n is None:
        return "NULL"
    # Use repr-style to avoid scientific notation for large numbers
    # Format: if it's a whole number, show as integer; else show float
    if n == int(n) and abs(n) < 1e15:
        return str(int(n))
    else:
        # Use enough precision
        return f"{n:.10g}"


def build_jsonb(fields_map, row, headers_idx):
    """
    Build a JSONB object from CSV fields.
    fields_map: dict of {json_key: csv_col_name}
    Returns SQL snippet: '{"key": val}'::jsonb  or NULL if all empty
    """
    result = {}
    all_null = True
    for json_key, csv_col in fields_map.items():
        if csv_col not in headers_idx:
            result[json_key] = None
            continue
        raw = row[headers_idx[csv_col]]

        # Percentage fields
        if "porcentaje" in csv_col:
            n = clean_numeric(raw)
            # If raw had %, clean_numeric already divided by 100
            # But we need to check: if original value was e.g. "100%" -> 1.0
            result[json_key] = n
        else:
            n = clean_numeric(raw)
            result[json_key] = n

        if result[json_key] is not None:
            all_null = False

    if all_null:
        return "NULL"

    # Build JSON manually to control output
    parts = []
    for k, v in result.items():
        if v is None:
            parts.append(f'"{k}": null')
        elif isinstance(v, float):
            if v == int(v) and abs(v) < 1e15:
                parts.append(f'"{k}": {int(v)}')
            else:
                parts.append(f'"{k}": {v:.10g}')
        else:
            parts.append(f'"{k}": {v}')

    json_str = "{" + ", ".join(parts) + "}"
    # Escape single quotes in json string
    json_str_escaped = json_str.replace("'", "''")
    return f"'{json_str_escaped}'::jsonb"


def process_csv():
    errors = []
    value_blocks = []

    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        headers = next(reader)
        headers_idx = {h: i for i, h in enumerate(headers)}

        rows = list(reader)

    print(f"CSV loaded: {len(rows)} data rows, {len(headers)} columns")

    # JSONB field mappings: {json_key: csv_column_name}
    presupuesto_2024_map = {
        "total_apropiacion": "total_apropiacion_2024",
        "neto_registros": "neto_registros_2024",
        "total_obligacion": "total_obligacin_2024",
        "pct_ejecucion_obligado": "porcentaje_de_ejecucion_respecto_a_lo_obligado",
        "pct_ejecucion_pagos": "porcentaje_de_ejecucion_respecto_los_pagos",
        "presupuesto_comprometer": "presupuesto_a_comprometer",
    }
    presupuesto_2025_map = {
        "total_apropiacion": "total_apropiacion_2025",
        "neto_registros": "neto_registros_2025",
        "total_obligacion": "total_obligacin_2025",
        "pct_ejecucion_obligado": "porcentaje_de_ejecucion_respecto_a_lo_obligado_1",
        "pct_ejecucion_pagos": "porcentaje_de_ejecucion_respecto_los_pagos_1",
        "presupuesto_comprometer": "presupuesto_a_comprometer_1",
    }
    presupuesto_2026_map = {
        "total_apropiacion": "total_apropiacion_2026",
        "neto_registros": "neto_registros_2026",
        "total_obligacion": "total_obligacin_2026",
        "pct_ejecucion_obligado": "porcentaje_de_ejecucion_respecto_a_lo_obligado_2",
        "pct_ejecucion_pagos": "porcentaje_de_ejecucion_respecto_los_pagos_2",
        "presupuesto_comprometer": "presupuesto_a_comprometer_2",
    }
    presupuesto_2027_map = {
        "total_apropiacion": "total_apropiacion_2027",
        "neto_registros": "neto_registros_2027",
        "total_obligacion": "total_obligacin_2027",
        "pct_ejecucion_obligado": "porcentaje_de_ejecucion_respecto_a_lo_obligado_3",
        "pct_ejecucion_pagos": "porcentaje_de_ejecucion_respecto_los_pagos_3",
        "presupuesto_comprometer": "presupuesto_por_comprometer",
    }

    def g(col):
        """Get raw value from row by column name."""
        if col not in headers_idx:
            return ""
        idx = headers_idx[col]
        if idx >= len(row):
            return ""
        return row[idx]

    row_num = 0
    skipped = 0
    for row in rows:
        row_num += 1
        try:
            # ── Guard: skip rows where secretaria is NULL (NOT NULL constraint) ──
            raw_secretaria = g("secretaria")
            if is_null_val(raw_secretaria):
                print(f"  [SKIP] Row {row_num}: secretaria is empty/null (meta={repr(g('metas'))})", file=sys.stderr)
                skipped += 1
                continue

            # ── Guard: skip rows where meta_num is NULL (likely trailing empty rows) ──
            raw_meta = g("metas")
            if is_null_val(raw_meta):
                print(f"  [SKIP] Row {row_num}: meta_num is empty/null — likely trailing empty row, skipping.", file=sys.stderr)
                skipped += 1
                continue

            # ── Simple columns ──────────────────────────────────────────────
            meta_num         = sql_val_int(g("metas"))
            cod_dependencia  = sql_val_int(g("cod_dependencia"))
            num_pilar        = sql_val_int(g("no_pilar"))
            nom_pilar        = sql_val_text(g("nom_del_pilar"))
            macrometa        = sql_val_text(g("macrometas"))
            cod_sector       = sql_val_int(g("cod_sector"))
            nom_sector       = sql_val_text(g("nom_sector"))
            cod_programa     = sql_val_int(g("cod_programa"))
            nombre_programa  = sql_val_text(g("nombre_del_programa"))
            cod_bpin         = sql_val_text(g("cod_bpin"))
            acciones_plan    = sql_val_text(g("acciones_del_plan"))
            unidad_medida    = sql_val_text(g("unidad_de_medida"))
            linea_base       = sql_val_text(g("linea_base"))
            anio_base        = sql_val_int(g("ao"))

            # codigo_producto: float-like -> int
            cod_prod_raw = g("codigo_producto")
            cod_prod_n = clean_numeric(cod_prod_raw)
            codigo_producto = str(int(round(cod_prod_n))) if cod_prod_n is not None else "NULL"

            indicador_meta   = sql_val_text(g("indicador_de_p___meta"))
            secretaria       = sql_val_text(g("secretaria"))
            descripcion_meta = sql_val_text(g("descripcion_meta"))
            meta_cuatrienio  = sql_val_numeric(g("meta"))
            tipo_ponderado   = sql_val_text(g("tipo_de_ponderado"))

            # Annual meta columns (NP/empty → NULL)
            meta_pdm_2024    = sql_val_numeric(g("meta_pdm"))
            meta_fisica_2024 = sql_val_numeric(g("meta_fisica_realizada"))
            meta_pdm_2025    = sql_val_numeric(g("meta_pdm_1"))
            meta_fisica_2025 = sql_val_numeric(g("meta_fisica_realizada_1"))
            meta_pdm_2026    = sql_val_numeric(g("meta_pdm_2"))
            meta_fisica_2026 = sql_val_numeric(g("meta_fisica_realizada_2"))
            meta_pdm_2027    = sql_val_numeric(g("meta_pdm_3"))
            meta_fisica_2027 = sql_val_numeric(g("meta_fisica_realizada_3"))

            # JSONB presupuesto
            presupuesto_2024 = build_jsonb(presupuesto_2024_map, row, headers_idx)
            presupuesto_2025 = build_jsonb(presupuesto_2025_map, row, headers_idx)
            presupuesto_2026 = build_jsonb(presupuesto_2026_map, row, headers_idx)
            presupuesto_2027 = build_jsonb(presupuesto_2027_map, row, headers_idx)

            # Avance / cumplimiento / ponderado
            avance_fisico           = sql_val_numeric(g("avance_fisico"))
            cumplimiento_cuatrienio = sql_val_numeric(g("pct_de_cumplimiento_cuatrienio"))
            ponderado_cuatrienio    = sql_val_numeric(g("r__pond_avance_cuatrienio"))

            # Eficiencia
            eficiencia_2024 = sql_val_numeric(g("eficiencia_2024"))
            eficiencia_2025 = sql_val_numeric(g("eficiencia_2025"))
            eficiencia_2026 = sql_val_numeric(g("eficiencia_2026"))
            eficiencia_2027 = sql_val_numeric(g("eficiencia_2027"))

            # Ponderado avance por año
            ponderado_avance_2024 = sql_val_numeric(g("r__pond_avance_ao1"))
            ponderado_avance_2025 = sql_val_numeric(g("r__pond_avance_ao2"))
            ponderado_avance_2026 = sql_val_numeric(g("r__pond_avance_ao3"))
            ponderado_avance_2027 = sql_val_numeric(g("r__pond_avance_ao4"))

            # Observaciones / compromisos
            observaciones_2024  = sql_val_text(g("observaciones"))
            compromisos_2024    = sql_val_text(g("compromisos"))
            observaciones_2025  = sql_val_text(g("observaciones_1"))
            compromisos_2025    = sql_val_text(g("compromisos_1"))
            observaciones_2026  = sql_val_text(g("observaciones_2"))
            compromisos_2026    = sql_val_text(g("compromisos_2"))
            observaciones_2027  = sql_val_text(g("observaciones_3"))
            compromisos_2027    = sql_val_text(g("compromisos_3"))

            # Build VALUES tuple
            vals = (
                f"  ({meta_num}, {cod_dependencia}, {num_pilar}, {nom_pilar}, {macrometa},\n"
                f"   {cod_sector}, {nom_sector}, {cod_programa}, {nombre_programa}, {cod_bpin},\n"
                f"   {acciones_plan}, {unidad_medida}, {linea_base}, {anio_base}, {codigo_producto},\n"
                f"   {indicador_meta}, {secretaria}, {descripcion_meta}, {meta_cuatrienio}, {tipo_ponderado},\n"
                f"   {meta_pdm_2024}, {meta_fisica_2024}, {meta_pdm_2025}, {meta_fisica_2025},\n"
                f"   {meta_pdm_2026}, {meta_fisica_2026}, {meta_pdm_2027}, {meta_fisica_2027},\n"
                f"   {presupuesto_2024}, {presupuesto_2025}, {presupuesto_2026}, {presupuesto_2027},\n"
                f"   {avance_fisico}, {cumplimiento_cuatrienio}, {ponderado_cuatrienio},\n"
                f"   {eficiencia_2024}, {eficiencia_2025}, {eficiencia_2026}, {eficiencia_2027},\n"
                f"   {ponderado_avance_2024}, {ponderado_avance_2025}, {ponderado_avance_2026}, {ponderado_avance_2027},\n"
                f"   {observaciones_2024}, {compromisos_2024}, {observaciones_2025}, {compromisos_2025},\n"
                f"   {observaciones_2026}, {compromisos_2026}, {observaciones_2027}, {compromisos_2027})"
            )
            value_blocks.append(vals)

        except Exception as exc:
            errors.append(f"Row {row_num}: {exc}")
            print(f"  [ERROR] Row {row_num}: {exc}", file=sys.stderr)

    return value_blocks, errors, skipped


def main():
    print(f"Reading CSV: {CSV_PATH}")
    value_blocks, errors, skipped = process_csv()

    print(f"Rows processed successfully: {len(value_blocks)}")
    print(f"Rows skipped (empty/null NOT NULL fields): {skipped}")
    if errors:
        print(f"Errors encountered: {len(errors)}")
        for e in errors:
            print(f"  {e}")

    # Build SQL
    sql_body = HEADER
    sql_body += ",\n".join(value_blocks)
    sql_body += ";\n"

    # Ensure output directory exists
    os.makedirs(os.path.dirname(SQL_OUTPUT), exist_ok=True)

    with open(SQL_OUTPUT, "w", encoding="utf-8") as f:
        f.write(sql_body)

    print(f"\nSQL file written: {SQL_OUTPUT}")
    print(f"File size: {os.path.getsize(SQL_OUTPUT):,} bytes")

    # Count lines
    with open(SQL_OUTPUT, encoding="utf-8") as f:
        lines = f.readlines()
    print(f"SQL file lines: {len(lines)}")
    print("Done.")


if __name__ == "__main__":
    main()
