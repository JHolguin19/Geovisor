import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

// En producción se usa DATABASE_URL (Supabase connection string).
// En desarrollo se usan las variables individuales.
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase requiere SSL
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'geovisor',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

export const pool = new Pool(poolConfig);

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
