import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Datos mock para formularios (en producción vendrían de la BD)
const FORM_SUBMISSIONS = [];

// POST /api/forms/submit - Enviar datos de formulario
router.post('/submit', authMiddleware, (req, res) => {
  try {
    const { secretaria, data, type } = req.body;

    if (!secretaria || !data) {
      return res.status(400).json({ error: 'Secretaría y datos requeridos' });
    }

    // Verificar permisos
    if (req.user.role === 'lector') {
      return res.status(403).json({ error: 'No tiene permisos para enviar datos' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'editor_geo') {
      if (req.user.secretaria !== secretaria) {
        return res.status(403).json({ error: 'No puede enviar datos para esta secretaría' });
      }
    }

    const submission = {
      id: FORM_SUBMISSIONS.length + 1,
      secretaria,
      type,
      data,
      userId: req.user.id,
      timestamp: new Date().toISOString()
    };

    FORM_SUBMISSIONS.push(submission);

    res.json({
      message: 'Datos enviados exitosamente',
      submission
    });

  } catch (error) {
    console.error('Error al enviar formulario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/forms/history/:secretariaId - Historial de envíos
router.get('/history/:secretariaId', authMiddleware, (req, res) => {
  const secretariaId = req.params.secretariaId;

  // Verificar permisos
  if (req.user.role === 'lector') {
    return res.status(403).json({ error: 'No tiene acceso al historial' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'editor_geo') {
    if (req.user.secretaria !== secretariaId) {
      return res.status(403).json({ error: 'No tiene acceso a este historial' });
    }
  }

  const submissions = FORM_SUBMISSIONS.filter(s => s.secretaria === secretariaId);

  res.json({ submissions });
});

export default router;
