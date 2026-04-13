// seed.js — Poblar BD con datos iniciales (secretarías, usuarios, capas)
// Ejecutar: node src/db/seed.js

import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Crear tablas desde schema.sql ──────────────────────
    console.log('Creando tablas...');
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(sql);

    // ── 2. Secretarías ────────────────────────────────────────
    console.log('Insertando secretarías...');
    const secretarias = [
      ['sig',             'Sec. de Información Geográfica', 'SIG',         'SIG', '#1A5F9B', 'Gestión territorial, catastro y análisis geoespacial completo del municipio.', 'sig',                  true,  1],
      ['planeacion',      'Secretaría de Planeación',       'Planeación',  'PLA', '#1565C0', 'Ordenamiento territorial, predios urbanos, UBAs y usos de suelo.',             'planeacion',           true,  2],
      ['obras',           'Secretaría de Infraestructura',  'Infraestructura','OBR','#4E342E','Alumbrado público, pavimentación y obras de infraestructura vial.',            'servicios_publicos',   true,  3],
      ['ambiente',        'Secretaría de Ambiente',         'Ambiente',    'AMB', '#2E7D32', 'Zonas verdes, espacios públicos y equipamiento biosaludable.',                 'zonas_verdes',         true,  4],
      ['educacion',       'Secretaría de Educación',        'Educación',   'EDU', '#E65100', 'Instituciones educativas, sedes y cobertura territorial.',                     'educacion',            true,  5],
      ['desarrollo_social','Secretaría de Desarrollo Social','Desarrollo Social','DES','#6A1B9A','Información Sisben, población y datos socioeconómicos por UBA.',           'sisben',               true,  6],
      ['gobierno',        'Secretaría de Gobierno',         'Gobierno',    'GOB', '#00695C', 'Equipamiento institucional, templos y sedes gubernamentales.',                 'equipo_institucional', true,  7],
      ['salud',           'Secretaría de Salud',            'Salud',       'SAL', '#B71C1C', 'Infraestructura de salud, IPS y cobertura de servicios médicos.',              null,                   false, 8],
      ['hacienda',        'Secretaría de Hacienda',         'Hacienda',    'HAC', '#1B5E20', 'Avalúos catastrales, predios tributarios y cartografía fiscal.',               null,                   false, 9],
      ['cultura',         'Secretaría de Cultura',          'Cultura',     'CUL', '#AD1457', 'Espacios culturales, patrimonio y cobertura de eventos municipales.',          null,                   false,10],
      ['deportes',        'Secretaría de Deportes',         'Deportes',    'DEP', '#00838F', 'Escenarios deportivos, parques y equipamiento recreativo.',                    null,                   false,11],
      ['transito',        'Secretaría de Tránsito',         'Tránsito',    'TRA', '#E64A19', 'Vías, semáforos, señalización y movilidad urbana.',                            null,                   false,12],
      ['seguridad',       'Secretaría de Seguridad',        'Seguridad',   'SEG', '#37474F', 'Cuadrantes de seguridad, cámaras y cobertura de vigilancia.',                  null,                   false,13],
      ['juridica',        'Secretaría Jurídica',            'Jurídica',    'JUR', '#4527A0', 'Predios en litigio, linderos y asuntos legales territoriales.',                null,                   false,14],
      ['talento_humano',  'Talento Humano',                 'Talento Humano','TH','#5D4037', 'Distribución de funcionarios y sedes administrativas.',                        null,                   false,15],
    ];

    for (const [id, nombre, short_name, codigo, color, descripcion, layers_key, tiene_mapa, orden] of secretarias) {
      await client.query(`
        INSERT INTO secretarias (id, nombre, short_name, codigo, color, descripcion, layers_key, tiene_mapa, orden)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING
      `, [id, nombre, short_name, codigo, color, descripcion, layers_key, tiene_mapa, orden]);
    }

    // ── 3. Usuarios ───────────────────────────────────────────
    console.log('Insertando usuarios...');
    const usuarios = [
      ['admin',      'admin123',       'Administrador',          'admin',      null],
      ['planeacion', 'planeacion123',  'Planeación Municipal',   'secretaria', 'planeacion'],
      ['salud',      'salud123',       'Salud Municipal',        'secretaria', 'salud'],
      ['educacion',  'educacion123',   'Educación Municipal',    'secretaria', 'educacion'],
      ['lector',     'lector123',      'Usuario Lector',         'lector',     'planeacion'],
      ['juanpablo',  'geovisor123',    'Juan Pablo Holguín',     'editor_geo', null],
    ];

    for (const [username, password, nombre_completo, rol, secretaria_id] of usuarios) {
      const hash = await bcrypt.hash(password, 10);
      await client.query(`
        INSERT INTO usuarios (username, password_hash, nombre_completo, rol, secretaria_id)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (username) DO NOTHING
      `, [username, hash, nombre_completo, rol, secretaria_id]);
    }

    // ── 4. Tablas PostGIS (geo_tablas) ────────────────────────
    console.log('Registrando tablas PostGIS...');
    const geoTablas = [
      // [nombre_tabla, secretaria_id, descripcion, tipo_geometria, publica]
      ['planeacion_predios_2025',                     'planeacion',      'Predios urbanos 2025 con datos catastrales', 'polygon', true],
      ['planeacion_predios_urbanos_2025',             'planeacion',      'Predios urbanos 2025 (geometría original)',  'polygon', true],
      ['planeacion_barrios_urbanos',                  'planeacion',      'Barrios del área urbana',                    'polygon', true],
      ['planeacion_uba1',                             'planeacion',      'UBA 1',                                      'polygon', true],
      ['planeacion_uba2',                             'planeacion',      'UBA 2',                                      'polygon', true],
      ['planeacion_uba3',                             'planeacion',      'UBA 3',                                      'polygon', true],
      ['planeacion_uba4',                             'planeacion',      'UBA 4',                                      'polygon', true],
      ['planeacion_uba5',                             'planeacion',      'UBA 5',                                      'polygon', true],
      ['planeacion_ubac',                             'planeacion',      'UBA C',                                      'polygon', true],
      ['planeacion_estanco',                          'planeacion',      'Establecimientos Estanco',                   'point',   false],
      ['planeacion_discotecas',                       'planeacion',      'Establecimientos Discotecas',                'point',   false],
      ['planeacion_droguerias',                       'planeacion',      'Establecimientos Droguerías',                'point',   false],
      ['planeacion_ferreterias',                      'planeacion',      'Establecimientos Ferreterías',               'point',   false],
      ['planeacion_ips',                              'planeacion',      'Establecimientos IPS',                       'point',   false],
      ['planeacion_restaurantes',                     'planeacion',      'Establecimientos Restaurantes',              'point',   false],
      ['planeacion_servicios',                        'planeacion',      'Establecimientos Servicios',                 'point',   false],
      ['SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025','planeacion',   'Nomenclatura Vial IGAC 2025',                'line',    true],
      ['planeacion_zonas_verdes',                     'ambiente',        'Zonas verdes y espacios públicos',           'polygon', true],
      ['planeacion_gimnasios_biosaludables',          'ambiente',        'Gimnasios biosaludables',                    'point',   true],
      ['planeacion_sisben_barrios',                   'desarrollo_social','Información Sisben por barrios',            'polygon', false],
      ['planeacion_sisben_uba2',                      'desarrollo_social','Datos de población UBA 2',                  'polygon', false],
      ['planeacion_sisben_uba4',                      'desarrollo_social','Datos Sisben UBA 4',                        'polygon', false],
      ['educacion_predios_educativos',                'educacion',       'Instituciones educativas',                   'polygon', true],
      ['planeacion_equipo_institucional',             'gobierno',        'Equipamiento institucional',                 'polygon', true],
      ['planeacion_iglesias',                         'gobierno',        'Templos e iglesias',                         'polygon', true],
      ['obras_transformadores',                       'obras',           'Transformadores alumbrado público',          'point',   false],
      ['obras_luminarias_tradicionales',              'obras',           'Luminarias tradicionales',                   'point',   false],
      ['obras_apoyos_alumbrado',                      'obras',           'Apoyos (postes) alumbrado público',          'point',   false],
      ['obras_luminarias_led',                        'obras',           'Luminarias LED',                             'point',   false],
      ['obras_rutas_alumbrado',                       'obras',           'Rutas eléctricas alumbrado público',         'line',    false],
      ['obras_pavimentacion',                         'obras',           'Obras de pavimentación 2025',                'polygon', false],
      ['obras_pavimentacion2',                        'obras',           'Pavimentación 2025 lote 2',                  'polygon', false],
    ];

    for (const [nombre_tabla, secretaria_id, descripcion, tipo_geometria, publica] of geoTablas) {
      await client.query(`
        INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, tipo_geometria, publica)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (nombre_tabla) DO NOTHING
      `, [nombre_tabla, secretaria_id, descripcion, tipo_geometria, publica]);
    }

    // ── 5. Capas ──────────────────────────────────────────────
    console.log('Insertando capas...');
    const capas = [
      // [id, nombre, secretaria_id, tabla_postgis, color, visible, queryable, zIndex, descripcion, cols, tipo, orden]
      ['predios_urbanos',        'Predios Urbanos',         'planeacion',      'planeacion_predios_2025',                  '#E53935', true,  true,  2,  'Predios urbanos del municipio',                'matriculainmobiliaria,codigo,direccion,areaterreno_m2,areaconstruida_m2,avaluo,destinoeconomico', 'polygon', 1],
      ['nomenclatura_vial',      'Nomenclatura Vial',       'planeacion',      'SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025','#607D8B',true,true,1,'Nomenclatura vial del municipio',null,'line',2],
      ['barrios_urbanos',        'Barrios Urbanos',         'planeacion',      'planeacion_barrios_urbanos',                '#1976D2', false, true,  1,  'Barrios del área urbana',                      null,    'polygon', 3],
      ['uba1',                   'UBA 1',                   'planeacion',      'planeacion_uba1',                          '#e53935', false, true,  1,  'Unidad Barrial de Atención 1',                 null,    'polygon', 4],
      ['uba2',                   'UBA 2',                   'planeacion',      'planeacion_uba2',                          '#43a047', false, true,  1,  'Unidad Barrial de Atención 2',                 null,    'polygon', 5],
      ['uba3',                   'UBA 3',                   'planeacion',      'planeacion_uba3',                          '#1e88e5', false, true,  1,  'Unidad Barrial de Atención 3',                 null,    'polygon', 6],
      ['uba4',                   'UBA 4',                   'planeacion',      'planeacion_uba4',                          '#fb8c00', false, true,  1,  'Unidad Barrial de Atención 4',                 null,    'polygon', 7],
      ['uba5',                   'UBA 5',                   'planeacion',      'planeacion_uba5',                          '#8e24aa', false, true,  1,  'Unidad Barrial de Atención 5',                 null,    'polygon', 8],
      ['ubac',                   'UBA C',                   'planeacion',      'planeacion_ubac',                          '#00acc1', false, true,  1,  'Unidad Barrial de Atención Centro',            null,    'polygon', 9],
      ['uso_estanco',            'Estanco',                 'planeacion',      'planeacion_estanco',                       '#8B0000', false, true,  20, null,                                           null,    'point',  10],
      ['uso_discotecas',         'Discotecas',              'planeacion',      'planeacion_discotecas',                    '#FF00FF', false, true,  20, null,                                           null,    'point',  11],
      ['uso_droguerias',         'Droguerías',              'planeacion',      'planeacion_droguerias',                    '#00BFFF', false, true,  20, null,                                           null,    'point',  12],
      ['uso_ferreterias',        'Ferreterías',             'planeacion',      'planeacion_ferreterias',                   '#696969', false, true,  20, null,                                           null,    'point',  13],
      ['uso_ips',                'IPS',                     'planeacion',      'planeacion_ips',                           '#228B22', false, true,  20, null,                                           null,    'point',  14],
      ['uso_restaurantes',       'Restaurantes',            'planeacion',      'planeacion_restaurantes',                  '#FFA500', false, true,  20, null,                                           null,    'point',  15],
      ['uso_servicios',          'Servicios',               'planeacion',      'planeacion_servicios',                     '#4682B4', false, true,  20, null,                                           null,    'point',  16],
      ['zonas_verdes',           'Zonas Verdes',            'ambiente',        'planeacion_zonas_verdes',                  '#006400', false, true,  20, 'Áreas verdes y espacios públicos',             null,    'polygon', 1],
      ['gimnasios_biosaludables','Gimnasios Biosaludables', 'ambiente',        'planeacion_gimnasios_biosaludables',       '#22C55E', false, true,  20, 'Gimnasios al aire libre',                      null,    'point',   2],
      ['sisben_barrios',         'Sisben Barrios',          'desarrollo_social','planeacion_sisben_barrios',               '#9C27B0', false, true,  1,  'Información Sisben por barrios',               null,    'polygon', 1],
      ['sisben_uba2',            'Sisben UBA 2',            'desarrollo_social','planeacion_sisben_uba2',                  '#AB47BC', false, true,  1,  null,                                           null,    'polygon', 2],
      ['sisben_uba4',            'Sisben UBA 4',            'desarrollo_social','planeacion_sisben_uba4',                  '#CE93D8', false, true,  1,  null,                                           null,    'polygon', 3],
      ['predios_educativos',     'Predios Educativos',      'educacion',       'educacion_predios_educativos',             '#1E90FF', false, true,  10, 'Instituciones educativas',                     null,    'polygon', 1],
      ['equipo_institucional',   'Equipo Institucional',    'gobierno',        'planeacion_equipo_institucional',          '#3FEBBA', false, true,  10, 'Equipamiento institucional',                   null,    'polygon', 1],
      ['iglesias',               'Iglesias',                'gobierno',        'planeacion_iglesias',                      '#FFD700', false, true,  1,  'Templos e iglesias',                           null,    'polygon', 2],
      ['alumbrado_publico',      'Transformadores',         'obras',           'obras_transformadores',                    '#2563EB', false, true,  1,  'Transformadores de alumbrado público',         null,    'point',   1],
      ['luminarias_tradicionales','Luminarias Tradicionales','obras',          'obras_luminarias_tradicionales',           '#FBBF24', false, true,  1,  'Luminarias tradicionales',                     null,    'point',   2],
      ['apoyos_alumbrado_publico','Apoyos Alumbrado Público','obras',          'obras_apoyos_alumbrado',                   '#F97316', false, true,  1,  'Apoyos (postes) de alumbrado público',         null,    'point',   3],
      ['luminarias_led',         'Luminarias LED',          'obras',           'obras_luminarias_led',                     '#A3E635', false, true,  1,  'Luminarias LED',                               null,    'point',   4],
      ['rutas_alumbrado_publico','Rutas Alumbrado Público', 'obras',           'obras_rutas_alumbrado',                    '#DC2626', false, true,  1,  'Rutas eléctricas de alumbrado público',        null,    'line',    5],
      ['obras_pavimentacion',    'Obras de Pavimentación',  'obras',           'obras_pavimentacion',                      '#57534E', false, true,  15, 'Obras de pavimentación 2025',                  null,    'polygon', 6],
      ['pavimentacion2',         'Pavimentación 2',         'obras',           'obras_pavimentacion2',                     '#57534E', false, true,  15, 'Obras de pavimentación 2025 lote 2',           null,    'polygon', 7],
    ];

    for (const [id, nombre, sec_id, tabla, color, visible, queryable, zIndex, desc, cols, tipo, orden] of capas) {
      await client.query(`
        INSERT INTO capas (id, nombre, secretaria_id, tabla_postgis, color, visible_defecto, queryable, z_index, descripcion, columnas_consulta, tipo_geometria, orden)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `, [id, nombre, sec_id, tabla, color, visible, queryable, zIndex, desc, cols, tipo, orden]);
    }

    // ── 6. Campos popup ───────────────────────────────────────
    console.log('Insertando popup fields...');
    const popupFields = [
      // predios_urbanos
      ['predios_urbanos', 'matriculainmobiliaria', 'Matrícula Inmobiliaria', 'text',     1],
      ['predios_urbanos', 'codigo',                'Número Predial',         'text',     2],
      ['predios_urbanos', 'direccion',             'Dirección',              'text',     3],
      ['predios_urbanos', 'areaterreno_m2',        'Área Terreno (m²)',      'number',   4],
      ['predios_urbanos', 'areaconstruida_m2',     'Área Construida (m²)',   'number',   5],
      ['predios_urbanos', 'avaluo',                'Avalúo',                 'text',     6],
      ['predios_urbanos', 'destinoeconomico',      'Destino Económico',      'text',     7],
      // predios_educativos
      ['predios_educativos', 'Nombre',             'Nombre',                 'text',     1],
      ['predios_educativos', 'sede',               'Sede',                   'text',     2],
      ['predios_educativos', 'NOMBRE_2',           'Barrio',                 'text',     3],
      ['predios_educativos', 'educacion',          'Tipo',                   'text',     4],
      ['predios_educativos', 'numero_estudiantes', 'Número de Estudiantes',  'number',   5],
      ['predios_educativos', 'jornada',            'Jornada',                'text',     6],
      // sisben_uba2
      ['sisben_uba2', 'poblacion_total',    'Población Total',    'number', 1],
      ['sisben_uba2', 'poblacion_hombre',   'Población Hombres',  'number', 2],
      ['sisben_uba2', 'poblacion_mujer',    'Población Mujeres',  'number', 3],
      ['sisben_uba2', 'cantidad_hogares',   'Cantidad Hogares',   'number', 4],
      ['sisben_uba2', 'cantidad_viviendas', 'Cantidad Viviendas', 'number', 5],
    ];

    for (const [capa_id, campo, etiqueta, formato, orden] of popupFields) {
      await client.query(`
        INSERT INTO capas_popup_fields (capa_id, campo, etiqueta, formato, orden)
        VALUES ($1,$2,$3,$4,$5)
      `, [capa_id, campo, etiqueta, formato, orden]);
    }

    await client.query('COMMIT');
    console.log('✓ Seed completado exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error en seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
