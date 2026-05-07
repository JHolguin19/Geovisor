/**
 * apply-migration.mjs — Aplica un archivo SQL de migración a la base de datos.
 * Uso: node scripts/apply-migration.mjs <nombre-archivo.sql>
 * Ejemplo: node scripts/apply-migration.mjs 014_fix_total_apropiacion_2026.sql
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Uso: node scripts/apply-migration.mjs <archivo.sql>');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '../src/db/migrations', sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`Archivo no encontrado: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf-8');

const client = new pg.Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

try {
  await client.connect();
  console.log(`Conectado. Aplicando ${sqlFile}...`);
  await client.query(sql);
  console.log('Migración aplicada correctamente.');
} catch (err) {
  console.error('Error al aplicar migración:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
