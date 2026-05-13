-- Migration 020: Agregar destino_economico a planeacion_zonarural2025_avaluos
-- El campo sigue el estándar IGAC (letras A–T) para uso económico del predio.
-- Se deja vacío hasta que se importe el archivo R1-R2 rural de IGAC.

ALTER TABLE public.planeacion_zonarural2025_avaluos
  ADD COLUMN IF NOT EXISTS destino_economico VARCHAR(5);

CREATE INDEX IF NOT EXISTS idx_zonarural_avaluos_destino
  ON public.planeacion_zonarural2025_avaluos(destino_economico)
  WHERE destino_economico IS NOT NULL;

COMMENT ON COLUMN public.planeacion_zonarural2025_avaluos.destino_economico
  IS 'Código IGAC de destino económico (A=Habitacional, P=Ganadería, Q=Agrícola, R=Forestal, S=Protección, etc.)';
