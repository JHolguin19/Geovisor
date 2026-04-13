-- ============================================================
-- MIGRACIÓN 002 — Row Level Security (RLS) en todas las tablas
-- Ejecutada el 2026-04-13 via supabase db query --linked
-- ============================================================
-- NOTA: El backend Express usa el rol 'postgres' (superuser),
-- que bypasea RLS automáticamente. RLS solo bloquea acceso
-- directo no autenticado via PostgREST (API REST de Supabase).
-- ============================================================

-- Tablas de la aplicación (acceso controlado por Express + JWT)
ALTER TABLE usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas_popup_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE geo_tablas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretarias        ENABLE ROW LEVEL SECURITY;

-- Tablas geo base (datos cartográficos)
ALTER TABLE predios_2025_m                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bosques                                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE apoyos_alumbradopublico                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutas_alumbradopublico                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE luminariasled_alumbradopublico              ENABLE ROW LEVEL SECURITY;
ALTER TABLE luminariastradicionales_alumbradopublico    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subestaciones_alumbradopublico              ENABLE ROW LEVEL SECURITY;
ALTER TABLE barriosurbanos                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonasverdes                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_metas                                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sisben_barrios                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BARR_UBA2"                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BARR_UBA_1"                                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BARR_UBA3"                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BARR_UBA4"                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BARR_UBA5"                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BARRIOS_UBA_C"                             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Predios_urbanos_2025"                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Predios_urbanos_corregidosM"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "R1-R2_Santander_urbano.."                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Corte Santander — zonas verdes"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Gimnasiosbiosaludables"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SANTANDER IGAC 2025 — U_CONSTRUCCION_SDER_2025"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SANTANDER IGAC 2025 — U_TERRENO_SDER_2025"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SANTANDER IGAC 2025 — U_MANZANA_SDER_2025"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SANTANDER IGAC 2025 — U_NOMENCLATURA_DOMICIALIARIA_2025"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE usd_droguerias                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds2_droguerias                             ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds_otros                                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds_barestanco                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds_restaurantes                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds2_restaurantes                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds2_ferreteria                             ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds_ferreterias                             ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds_ips                                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds2_ips                                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uds2_bar-estanco"                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE predios_educativos                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE predios_equipo_institucional                ENABLE ROW LEVEL SECURITY;
ALTER TABLE predios_iglesias                            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pavimentacion2                              ENABLE ROW LEVEL SECURITY;
ALTER TABLE obraspavimentacion_infraestructura          ENABLE ROW LEVEL SECURITY;
ALTER TABLE gimbios                                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE uso_de_suelos_discotecas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE uds2_discos                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "discos2.0"                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE uba2_datospoblaciones                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE uba4_sisben_barrios                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sisben_uba4                                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE uba_4_centro_educativo                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE uba_4_equipo_institucional                  ENABLE ROW LEVEL SECURITY;

-- NOTA: spatial_ref_sys no se puede alterar (es propiedad de PostGIS extension)
-- NOTA: qgis_projects schema no está en public, no aplica
