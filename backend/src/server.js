import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import helmet from 'helmet';
import compression from 'compression';

import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import layersRoutes from './routes/layers.js';
import statsRoutes from './routes/stats.js';
import formsRoutes from './routes/forms.js';
import geodataRoutes from './routes/geodata.routes.js';
import capasRoutes from './routes/capas.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import pdmAnualRoutes from './routes/pdmAnual.routes.js';
import pdmRoutes from './routes/pdm.routes.js';
import sisbenRoutes from './routes/sisben.routes.js';
import catastroRoutes from './routes/catastro.js';
import viviendaRoutes from './routes/vivienda.js';
import alumbradoRoutes from './routes/alumbrado.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import etlRoutes from './routes/etl.routes.js';
import tablesRoutes from './routes/tables.routes.js';
import delitosRoutes from './routes/delitos.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

// ── Seguridad y rendimiento ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.use(compression());

// ── CORS ─────────────────────────────────────────────────────────────────────

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth',   limiter);
app.use('/api/layers', limiter);
app.use('/api/stats',  limiter);

const geodataLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api/geodata',   geodataLimiter);
app.use('/api/catastro',  geodataLimiter);
app.use('/api/vivienda',  geodataLimiter);
app.use('/api/alumbrado', geodataLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/layers',    layersRoutes);
app.use('/api/stats',     statsRoutes);
app.use('/api/forms',     formsRoutes);
app.use('/api/geodata',   geodataRoutes);
app.use('/api/capas',     capasRoutes);
app.use('/api/uploads',   uploadsRoutes);
app.use('/api/pdm/anual', pdmAnualRoutes);
app.use('/api/pdm',       pdmRoutes);
app.use('/api/sisben',    sisbenRoutes);
app.use('/api/catastro',  catastroRoutes);
app.use('/api/vivienda',  viviendaRoutes);
app.use('/api/alumbrado', alumbradoRoutes);
app.use('/api/usuarios',  usuariosRoutes);
app.use('/api/etl',       etlRoutes);
app.use('/api/tables',    tablesRoutes);
app.use('/api/delitos',   delitosRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 y error global ────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`GeoVisor Backend API — Puerto: ${PORT} — Entorno: ${process.env.NODE_ENV || 'development'}`);
});
