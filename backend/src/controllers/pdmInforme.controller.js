import { generarInformeIA, generarPDF } from '../services/pdmInforme.service.js';

export async function generarInforme(req, res) {
  const { year } = req.params;
  const { comentarios = '' } = req.body;

  const { texto, datos } = await generarInformeIA(year, comentarios);
  res.json({ texto, datos });
}

export async function descargarPDF(req, res) {
  const { year } = req.params;
  const { texto, comentarios = '' } = req.body;

  if (!texto) {
    return res.status(400).json({ error: 'Se requiere el texto del informe' });
  }

  const pdfBuffer = await generarPDF(texto, year, comentarios);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="Informe_PDM_${year}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });
  res.end(pdfBuffer);
}
