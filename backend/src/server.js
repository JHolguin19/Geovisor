import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import layersRoutes from './routes/layers.js';
import statsRoutes from './routes/stats.js';
import formsRoutes from './routes/forms.js';
import geodataRoutes from './routes/geodata.js';
import capasRoutes from './routes/capas.js';
import uploadsRoutes from './routes/uploads.js';
import pdmRoutes from './routes/pdm.js';
import sisbenRoutes from './routes/sisben.js';
import catastroRoutes from './routes/catastro.js';
import viviendaRoutes from './routes/vivienda.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
// FRONTEND_URL se define en las variables de entorno de Render.
// Acepta localhost en desarrollo y el dominio de Vercel en producción.
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir llamadas sin origin (Postman, curl, SSR)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Permitir cualquier subdominio *.vercel.app (previews de PR)
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true
}));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/auth', limiter);
app.use('/api/layers', limiter);
app.use('/api/stats', limiter);

// Rate limiting más alto para geodata (el visor carga muchas capas)
const geodataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use('/api/geodata', geodataLimiter);
app.use('/api/catastro', geodataLimiter);
app.use('/api/vivienda', geodataLimiter);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de requests en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/layers', layersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/geodata', geodataRoutes);
app.use('/api/capas', capasRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/pdm', pdmRoutes);
app.use('/api/sisben', sisbenRoutes);
app.use('/api/catastro', catastroRoutes);
app.use('/api/vivienda', viviendaRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GeoVisor API running' });
});

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`GeoVisor Backend API`);
  console.log(`Puerto: ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});
