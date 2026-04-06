import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'geovisor',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en pool:', err.message);
});

// Verificar conexión al iniciar
pool.connect()
  .then(client => {
    console.log('[DB] Conectado a PostgreSQL correctamente');
    client.release();
  })
  .catch(err => {
    console.error('[DB] Error al conectar a PostgreSQL:', err.message);
  });

export default pool;
