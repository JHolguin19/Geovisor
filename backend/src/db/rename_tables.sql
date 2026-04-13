BEGIN;

-- 1. Quitar FK para poder renombrar sin conflictos
ALTER TABLE capas DROP CONSTRAINT capas_tabla_postgis_fkey;

-- ============================================================
-- 2. RENOMBRAR TABLAS POSTGIS + actualizar geo_tablas + capas
-- ============================================================

-- === PLANEACION (ya asignadas) ===
ALTER TABLE "BARR_UBA_1" RENAME TO planeacion_uba1;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_uba1' WHERE nombre_tabla = 'BARR_UBA_1';
UPDATE capas SET tabla_postgis = 'planeacion_uba1' WHERE tabla_postgis = 'BARR_UBA_1';

ALTER TABLE "BARR_UBA2" RENAME TO planeacion_uba2;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_uba2' WHERE nombre_tabla = 'BARR_UBA2';
UPDATE capas SET tabla_postgis = 'planeacion_uba2' WHERE tabla_postgis = 'BARR_UBA2';

ALTER TABLE "BARR_UBA3" RENAME TO planeacion_uba3;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_uba3' WHERE nombre_tabla = 'BARR_UBA3';
UPDATE capas SET tabla_postgis = 'planeacion_uba3' WHERE tabla_postgis = 'BARR_UBA3';

ALTER TABLE "BARR_UBA4" RENAME TO planeacion_uba4;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_uba4' WHERE nombre_tabla = 'BARR_UBA4';
UPDATE capas SET tabla_postgis = 'planeacion_uba4' WHERE tabla_postgis = 'BARR_UBA4';

ALTER TABLE "BARR_UBA5" RENAME TO planeacion_uba5;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_uba5' WHERE nombre_tabla = 'BARR_UBA5';
UPDATE capas SET tabla_postgis = 'planeacion_uba5' WHERE tabla_postgis = 'BARR_UBA5';

ALTER TABLE "BARRIOS_UBA_C" RENAME TO planeacion_ubac;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_ubac' WHERE nombre_tabla = 'BARRIOS_UBA_C';
UPDATE capas SET tabla_postgis = 'planeacion_ubac' WHERE tabla_postgis = 'BARRIOS_UBA_C';

ALTER TABLE barriosurbanos RENAME TO planeacion_barrios_urbanos;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_barrios_urbanos' WHERE nombre_tabla = 'barriosurbanos';
UPDATE capas SET tabla_postgis = 'planeacion_barrios_urbanos' WHERE tabla_postgis = 'barriosurbanos';

ALTER TABLE predios_2025_m RENAME TO planeacion_predios_2025;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_predios_2025' WHERE nombre_tabla = 'predios_2025_m';
UPDATE capas SET tabla_postgis = 'planeacion_predios_2025' WHERE tabla_postgis = 'predios_2025_m';

ALTER TABLE "Predios_urbanos_2025" RENAME TO planeacion_predios_urbanos_2025;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_predios_urbanos_2025' WHERE nombre_tabla = 'Predios_urbanos_2025';
UPDATE capas SET tabla_postgis = 'planeacion_predios_urbanos_2025' WHERE tabla_postgis = 'Predios_urbanos_2025';

-- Nomenclatura vial: usar patrón por el carácter especial en el nombre
DO $$
DECLARE
  v_old text;
BEGIN
  SELECT tablename INTO v_old FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE '%NOMENCLATURA_VIAL%';
  IF v_old IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I RENAME TO planeacion_nomenclatura_vial', v_old);
    UPDATE geo_tablas SET nombre_tabla = 'planeacion_nomenclatura_vial' WHERE nombre_tabla = v_old;
    UPDATE capas SET tabla_postgis = 'planeacion_nomenclatura_vial' WHERE tabla_postgis = v_old;
  END IF;
END $$;

ALTER TABLE uds_barestanco RENAME TO planeacion_estanco;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_estanco' WHERE nombre_tabla = 'uds_barestanco';
UPDATE capas SET tabla_postgis = 'planeacion_estanco' WHERE tabla_postgis = 'uds_barestanco';

ALTER TABLE uds_ferreterias RENAME TO planeacion_ferreterias;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_ferreterias' WHERE nombre_tabla = 'uds_ferreterias';
UPDATE capas SET tabla_postgis = 'planeacion_ferreterias' WHERE tabla_postgis = 'uds_ferreterias';

ALTER TABLE uds_ips RENAME TO planeacion_ips;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_ips' WHERE nombre_tabla = 'uds_ips';
UPDATE capas SET tabla_postgis = 'planeacion_ips' WHERE tabla_postgis = 'uds_ips';

ALTER TABLE uds_otros RENAME TO planeacion_servicios;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_servicios' WHERE nombre_tabla = 'uds_otros';
UPDATE capas SET tabla_postgis = 'planeacion_servicios' WHERE tabla_postgis = 'uds_otros';

ALTER TABLE uds_restaurantes RENAME TO planeacion_restaurantes;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_restaurantes' WHERE nombre_tabla = 'uds_restaurantes';
UPDATE capas SET tabla_postgis = 'planeacion_restaurantes' WHERE tabla_postgis = 'uds_restaurantes';

ALTER TABLE uds2_droguerias RENAME TO planeacion_droguerias;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_droguerias' WHERE nombre_tabla = 'uds2_droguerias';
UPDATE capas SET tabla_postgis = 'planeacion_droguerias' WHERE tabla_postgis = 'uds2_droguerias';

ALTER TABLE uso_de_suelos_discotecas RENAME TO planeacion_discotecas;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_discotecas' WHERE nombre_tabla = 'uso_de_suelos_discotecas';
UPDATE capas SET tabla_postgis = 'planeacion_discotecas' WHERE tabla_postgis = 'uso_de_suelos_discotecas';

-- === ZONAS VERDES y GIMNASIOS: de ambiente -> planeacion ===
ALTER TABLE "Gimnasiosbiosaludables" RENAME TO planeacion_gimnasios_biosaludables;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_gimnasios_biosaludables', secretaria_id = 'planeacion' WHERE nombre_tabla = 'Gimnasiosbiosaludables';
UPDATE capas SET tabla_postgis = 'planeacion_gimnasios_biosaludables', secretaria_id = 'planeacion' WHERE tabla_postgis = 'Gimnasiosbiosaludables';

ALTER TABLE zonasverdes RENAME TO planeacion_zonas_verdes;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_zonas_verdes', secretaria_id = 'planeacion' WHERE nombre_tabla = 'zonasverdes';
UPDATE capas SET tabla_postgis = 'planeacion_zonas_verdes', secretaria_id = 'planeacion' WHERE tabla_postgis = 'zonasverdes';

-- === SISBEN: de desarrollo_social -> planeacion ===
ALTER TABLE sisben_barrios RENAME TO planeacion_sisben_barrios;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_sisben_barrios', secretaria_id = 'planeacion' WHERE nombre_tabla = 'sisben_barrios';
UPDATE capas SET tabla_postgis = 'planeacion_sisben_barrios', secretaria_id = 'planeacion' WHERE tabla_postgis = 'sisben_barrios';

ALTER TABLE sisben_uba4 RENAME TO planeacion_sisben_uba4;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_sisben_uba4', secretaria_id = 'planeacion' WHERE nombre_tabla = 'sisben_uba4';
UPDATE capas SET tabla_postgis = 'planeacion_sisben_uba4', secretaria_id = 'planeacion' WHERE tabla_postgis = 'sisben_uba4';

ALTER TABLE uba2_datospoblaciones RENAME TO planeacion_sisben_uba2;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_sisben_uba2', secretaria_id = 'planeacion' WHERE nombre_tabla = 'uba2_datospoblaciones';
UPDATE capas SET tabla_postgis = 'planeacion_sisben_uba2', secretaria_id = 'planeacion' WHERE tabla_postgis = 'uba2_datospoblaciones';

-- === EDUCACION ===
ALTER TABLE predios_educativos RENAME TO educacion_predios_educativos;
UPDATE geo_tablas SET nombre_tabla = 'educacion_predios_educativos' WHERE nombre_tabla = 'predios_educativos';
UPDATE capas SET tabla_postgis = 'educacion_predios_educativos' WHERE tabla_postgis = 'predios_educativos';

-- === EQUIPO INSTITUCIONAL: de gobierno -> planeacion ===
ALTER TABLE predios_equipo_institucional RENAME TO planeacion_equipo_institucional;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_equipo_institucional', secretaria_id = 'planeacion' WHERE nombre_tabla = 'predios_equipo_institucional';
UPDATE capas SET tabla_postgis = 'planeacion_equipo_institucional', secretaria_id = 'planeacion' WHERE tabla_postgis = 'predios_equipo_institucional';

ALTER TABLE predios_iglesias RENAME TO planeacion_iglesias;
UPDATE geo_tablas SET nombre_tabla = 'planeacion_iglesias', secretaria_id = 'planeacion' WHERE nombre_tabla = 'predios_iglesias';
UPDATE capas SET tabla_postgis = 'planeacion_iglesias', secretaria_id = 'planeacion' WHERE tabla_postgis = 'predios_iglesias';

-- === OBRAS (Infraestructura) ===
ALTER TABLE apoyos_alumbradopublico RENAME TO obras_apoyos_alumbrado;
UPDATE geo_tablas SET nombre_tabla = 'obras_apoyos_alumbrado' WHERE nombre_tabla = 'apoyos_alumbradopublico';
UPDATE capas SET tabla_postgis = 'obras_apoyos_alumbrado' WHERE tabla_postgis = 'apoyos_alumbradopublico';

ALTER TABLE luminariasled_alumbradopublico RENAME TO obras_luminarias_led;
UPDATE geo_tablas SET nombre_tabla = 'obras_luminarias_led' WHERE nombre_tabla = 'luminariasled_alumbradopublico';
UPDATE capas SET tabla_postgis = 'obras_luminarias_led' WHERE tabla_postgis = 'luminariasled_alumbradopublico';

ALTER TABLE luminariastradicionales_alumbradopublico RENAME TO obras_luminarias_tradicionales;
UPDATE geo_tablas SET nombre_tabla = 'obras_luminarias_tradicionales' WHERE nombre_tabla = 'luminariastradicionales_alumbradopublico';
UPDATE capas SET tabla_postgis = 'obras_luminarias_tradicionales' WHERE tabla_postgis = 'luminariastradicionales_alumbradopublico';

ALTER TABLE obraspavimentacion_infraestructura RENAME TO obras_pavimentacion;
UPDATE geo_tablas SET nombre_tabla = 'obras_pavimentacion' WHERE nombre_tabla = 'obraspavimentacion_infraestructura';
UPDATE capas SET tabla_postgis = 'obras_pavimentacion' WHERE tabla_postgis = 'obraspavimentacion_infraestructura';

ALTER TABLE pavimentacion2 RENAME TO obras_pavimentacion2;
UPDATE geo_tablas SET nombre_tabla = 'obras_pavimentacion2' WHERE nombre_tabla = 'pavimentacion2';
UPDATE capas SET tabla_postgis = 'obras_pavimentacion2' WHERE tabla_postgis = 'pavimentacion2';

ALTER TABLE rutas_alumbradopublico RENAME TO obras_rutas_alumbrado;
UPDATE geo_tablas SET nombre_tabla = 'obras_rutas_alumbrado' WHERE nombre_tabla = 'rutas_alumbradopublico';
UPDATE capas SET tabla_postgis = 'obras_rutas_alumbrado' WHERE tabla_postgis = 'rutas_alumbradopublico';

ALTER TABLE subestaciones_alumbradopublico RENAME TO obras_transformadores;
UPDATE geo_tablas SET nombre_tabla = 'obras_transformadores' WHERE nombre_tabla = 'subestaciones_alumbradopublico';
UPDATE capas SET tabla_postgis = 'obras_transformadores' WHERE tabla_postgis = 'subestaciones_alumbradopublico';

-- ============================================================
-- 3. Restaurar FK
-- ============================================================
ALTER TABLE capas
  ADD CONSTRAINT capas_tabla_postgis_fkey
  FOREIGN KEY (tabla_postgis) REFERENCES geo_tablas(nombre_tabla) ON DELETE CASCADE;

COMMIT;
