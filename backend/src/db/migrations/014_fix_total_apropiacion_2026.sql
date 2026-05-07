-- Migration 014: Fix total_apropiacion_2026 (shifted by 2 rows in Excel source)
-- Root cause: col66 (TOTAL APROPIACION 2026) in PDM (1).xlsx had a 2-row offset
-- Reference: 011_reload_pdm_from_informe.sql (INFORME.csv - correct values)
-- Strategy: merge correct total_apropiacion into presupuesto_2026 JSONB,
--            preserving neto_registros and all other 2026 budget fields.

BEGIN;

-- meta 1: presupuesto_2026 missing total_apropiacion and neto_registros keys  →  add explicit 0 values
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || '{"total_apropiacion": 0, "neto_registros": 0}'::jsonb
  WHERE meta_num = 1;

-- meta 2: was 20,000,000.00  →  correct 600,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 600000000.0)
  WHERE meta_num = 2;

-- meta 3: was 15,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 3;

-- meta 4: was 0.00  →  correct 20,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 20000000.0)
  WHERE meta_num = 4;

-- meta 5: was 0.00  →  correct 15,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 15000000.0)
  WHERE meta_num = 5;

-- meta 8: was 14,520,562.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 8;

-- meta 9: was 18,507,143.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 9;

-- meta 10: was 7,014,285.00  →  correct 14,520,562.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 14520562.0)
  WHERE meta_num = 10;

-- meta 11: was 30,521,429.00  →  correct 18,507,143.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 18507143.0)
  WHERE meta_num = 11;

-- meta 12: was 0.00  →  correct 7,014,285.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 7014285.0)
  WHERE meta_num = 12;

-- meta 13: was 0.00  →  correct 30,521,429.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 30521429.0)
  WHERE meta_num = 13;

-- meta 14: was 25,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 14;

-- meta 15: was 15,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 15;

-- meta 16: was 44,122,584.00  →  correct 25,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 25000000.0)
  WHERE meta_num = 16;

-- meta 17: was 0.00  →  correct 15,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 15000000.0)
  WHERE meta_num = 17;

-- meta 18: was 0.00  →  correct 44,122,584.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 44122584.0)
  WHERE meta_num = 18;

-- meta 19: was 744,192,206.70  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 19;

-- meta 20: was 74,300,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 20;

-- meta 21: was 730,750,000.00  →  correct 744,192,206.70
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 744192206.7)
  WHERE meta_num = 21;

-- meta 22: was 5,000,000.00  →  correct 74,300,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 74300000.0)
  WHERE meta_num = 22;

-- meta 23: was 1,650,891,001.00  →  correct 730,750,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 730750000.0)
  WHERE meta_num = 23;

-- meta 24: was 0.00  →  correct 5,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 5000000.0)
  WHERE meta_num = 24;

-- meta 25: was 39,719,298.00  →  correct 1,650,891,001.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1650891001.0)
  WHERE meta_num = 25;

-- meta 26: was 15,000,000.00  →  correct 499,416,800.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 499416800.0)
  WHERE meta_num = 26;

-- meta 27: was 85,000,000.00  →  correct 39,719,298.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 39719298.0)
  WHERE meta_num = 27;

-- meta 28: was 325,549,400.00  →  correct 15,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 15000000.0)
  WHERE meta_num = 28;

-- meta 29: was 24,000,000.00  →  correct 85,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 85000000.0)
  WHERE meta_num = 29;

-- meta 30: was 50,000,000.00  →  correct 325,549,400.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 325549400.0)
  WHERE meta_num = 30;

-- meta 31: was 95,790,000.00  →  correct 24,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 24000000.0)
  WHERE meta_num = 31;

-- meta 32: was 0.00  →  correct 11,025,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 11025000.0)
  WHERE meta_num = 32;

-- meta 33: was 780,752,013.76  →  correct 95,790,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 95790000.0)
  WHERE meta_num = 33;

-- meta 35: was 0.00  →  correct 780,752,013.76
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 780752013.76)
  WHERE meta_num = 35;

-- meta 36: was 100,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 36;

-- meta 37: was 23,200,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 37;

-- meta 39: was 70,000,000.00  →  correct 135,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 135000000.0)
  WHERE meta_num = 39;

-- meta 40: was 80,000,000.00  →  correct 100,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 100000000.0)
  WHERE meta_num = 40;

-- meta 41: was 416,377,500.00  →  correct 70,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 70000000.0)
  WHERE meta_num = 41;

-- meta 42: was 0.00  →  correct 80,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 80000000.0)
  WHERE meta_num = 42;

-- meta 43: was 0.00  →  correct 416,377,500.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 416377500.0)
  WHERE meta_num = 43;

-- meta 44: was 60,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 44;

-- meta 45: was 30,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 45;

-- meta 46: was 1,939,534,390.00  →  correct 360,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 360000000.0)
  WHERE meta_num = 46;

-- meta 47: was 150,000,000.00  →  correct 450,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 450000000.0)
  WHERE meta_num = 47;

-- meta 48: was 718,138,200.00  →  correct 1,939,534,390.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1939534390.0)
  WHERE meta_num = 48;

-- meta 49: was 100,000,000.00  →  correct 150,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 150000000.0)
  WHERE meta_num = 49;

-- meta 50: was 121,861,800.00  →  correct 780,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 780000000.0)
  WHERE meta_num = 50;

-- meta 51: was 0.00  →  correct 100,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 100000000.0)
  WHERE meta_num = 51;

-- meta 52: was 30,000,000.00  →  correct 121,861,800.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 121861800.0)
  WHERE meta_num = 52;

-- meta 53: was 121,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 53;

-- meta 54: was 984,623,500.00  →  correct 30,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 30000000.0)
  WHERE meta_num = 54;

-- meta 55: was 20,103,525.00  →  correct 121,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 121000000.0)
  WHERE meta_num = 55;

-- meta 56: was 347,979,317.00  →  correct 984,623,500.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 984623500.0)
  WHERE meta_num = 56;

-- meta 57: was 15,647,991.55  →  correct 20,103,525.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 20103525.0)
  WHERE meta_num = 57;

-- meta 58: was 56,000,000.00  →  correct 347,979,317.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 347979317.0)
  WHERE meta_num = 58;

-- meta 59: was 2,265,959,565.84  →  correct 15,647,991.55
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 15647991.55)
  WHERE meta_num = 59;

-- meta 60: was 70,154,638.21  →  correct 56,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 56000000.0)
  WHERE meta_num = 60;

-- meta 61: was 200,000,000.00  →  correct 2,265,959,565.84
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 2265959565.84)
  WHERE meta_num = 61;

-- meta 62: was 0.00  →  correct 70,154,638.21
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 70154638.21)
  WHERE meta_num = 62;

-- meta 63: was 6,612,983,944.00  →  correct 200,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 200000000.0)
  WHERE meta_num = 63;

-- meta 65: was 15,000,000.00  →  correct 6,612,983,944.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 6612983944.0)
  WHERE meta_num = 65;

-- meta 66: was 2,000,000.00  →  correct 70,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 70000000.0)
  WHERE meta_num = 66;

-- meta 67: was 41,981,400.00  →  correct 15,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 15000000.0)
  WHERE meta_num = 67;

-- meta 68: was 230,000,000.00  →  correct 2,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 2000000.0)
  WHERE meta_num = 68;

-- meta 69: was 98,000,000.00  →  correct 41,981,400.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 41981400.0)
  WHERE meta_num = 69;

-- meta 70: was 0.00  →  correct 230,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 230000000.0)
  WHERE meta_num = 70;

-- meta 71: was 330,581,658.94  →  correct 98,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 98000000.0)
  WHERE meta_num = 71;

-- meta 73: was 20,000,000.00  →  correct 330,581,658.94
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 330581658.94)
  WHERE meta_num = 73;

-- meta 74: was 30,000,000.00  →  correct 10,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 10000000.0)
  WHERE meta_num = 74;

-- meta 75: was 30,000,000.00  →  correct 20,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 20000000.0)
  WHERE meta_num = 75;

-- meta 76: was 50,000,000.00  →  correct 30,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 30000000.0)
  WHERE meta_num = 76;

-- meta 77: was 60,000,000.00  →  correct 30,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 30000000.0)
  WHERE meta_num = 77;

-- meta 78: was 0.00  →  correct 101,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 101000000.0)
  WHERE meta_num = 78;

-- meta 79: was 0.00  →  correct 60,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 60000000.0)
  WHERE meta_num = 79;

-- meta 81: was 141,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 81;

-- meta 83: was 0.00  →  correct 141,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 141000000.0)
  WHERE meta_num = 83;

-- meta 87: was 40,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 87;

-- meta 88: was 126,790,941.06  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 88;

-- meta 90: was 60,000,000.00  →  correct 126,790,941.06
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 126790941.06)
  WHERE meta_num = 90;

-- meta 92: was 0.00  →  correct 60,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 60000000.0)
  WHERE meta_num = 92;

-- meta 93: was 70,000,000.00  →  correct 30,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 30000000.0)
  WHERE meta_num = 93;

-- meta 95: was 0.00  →  correct 70,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 70000000.0)
  WHERE meta_num = 95;

-- meta 96: was 28,071,400.00  →  correct 190,550,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 190550000.0)
  WHERE meta_num = 96;

-- meta 97: was 6,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 97;

-- meta 98: was 20,000,000.00  →  correct 28,071,400.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 28071400.0)
  WHERE meta_num = 98;

-- meta 99: was 60,000,000.00  →  correct 6,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 6000000.0)
  WHERE meta_num = 99;

-- meta 100: was 0.00  →  correct 86,910,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 86910000.0)
  WHERE meta_num = 100;

-- meta 101: was 0.00  →  correct 60,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 60000000.0)
  WHERE meta_num = 101;

-- meta 105: was 40,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 105;

-- meta 106: was 75,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 106;

-- meta 107: was 0.00  →  correct 40,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 40000000.0)
  WHERE meta_num = 107;

-- meta 108: was 50,000,000.00  →  correct 75,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 75000000.0)
  WHERE meta_num = 108;

-- meta 115: was 22,000,000.00  →  correct 35,200,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 35200000.0)
  WHERE meta_num = 115;

-- meta 116: was 32,377,077.51  →  correct 24,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 24000000.0)
  WHERE meta_num = 116;

-- meta 117: was 81,950,000.00  →  correct 22,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 22000000.0)
  WHERE meta_num = 117;

-- meta 118: was 680,130,039.00  →  correct 32,377,077.51
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 32377077.51)
  WHERE meta_num = 118;

-- meta 119: was 1,434,532,987.00  →  correct 81,950,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 81950000.0)
  WHERE meta_num = 119;

-- meta 120: was 87,277,500.00  →  correct 680,130,039.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 680130039.0)
  WHERE meta_num = 120;

-- meta 121: was 46,336,500.00  →  correct 1,434,532,987.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1434532987.0)
  WHERE meta_num = 121;

-- meta 122: was 15,141,000.00  →  correct 87,277,500.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 87277500.0)
  WHERE meta_num = 122;

-- meta 123: was 101,352,900.00  →  correct 46,336,500.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 46336500.0)
  WHERE meta_num = 123;

-- meta 124: was 19,425,000.00  →  correct -15,141,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', -15141000.0)
  WHERE meta_num = 124;

-- meta 125: was 22,711,500.00  →  correct 101,352,900.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 101352900.0)
  WHERE meta_num = 125;

-- meta 126: was 24,595,950.00  →  correct -19,425,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', -19425000.0)
  WHERE meta_num = 126;

-- meta 127: was 25,000,000.00  →  correct 22,711,500.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 22711500.0)
  WHERE meta_num = 127;

-- meta 128: was 5,000,000.00  →  correct 24,595,950.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 24595950.0)
  WHERE meta_num = 128;

-- meta 129: was 70,000,000.00  →  correct 25,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 25000000.0)
  WHERE meta_num = 129;

-- meta 130: was 866,345,422.00  →  correct 5,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 5000000.0)
  WHERE meta_num = 130;

-- meta 131: was 11,925,000.00  →  correct 70,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 70000000.0)
  WHERE meta_num = 131;

-- meta 132: was 46,800,000.00  →  correct 866,345,422.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 866345422.0)
  WHERE meta_num = 132;

-- meta 133: was 129,500,000.00  →  correct 11,925,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 11925000.0)
  WHERE meta_num = 133;

-- meta 134: was 10,500,000.00  →  correct 46,800,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 46800000.0)
  WHERE meta_num = 134;

-- meta 135: was 75,000,000.00  →  correct 309,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 309000000.0)
  WHERE meta_num = 135;

-- meta 136: was 15,000,000.00  →  correct 30,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 30000000.0)
  WHERE meta_num = 136;

-- meta 137: was 85,000,000.00  →  correct 75,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 75000000.0)
  WHERE meta_num = 137;

-- meta 138: was 33,000,000.00  →  correct 15,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 15000000.0)
  WHERE meta_num = 138;

-- meta 139: was 1,250,000,000.00  →  correct 308,400,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 308400000.0)
  WHERE meta_num = 139;

-- meta 140: was 900,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 140;

-- meta 141: was 0.00  →  correct 1,250,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1250000000.0)
  WHERE meta_num = 141;

-- meta 142: was 0.00  →  correct 900,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 900000000.0)
  WHERE meta_num = 142;

-- meta 144: was 110,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 144;

-- meta 146: was 65,000,000.00  →  correct 110,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 110000000.0)
  WHERE meta_num = 146;

-- meta 147: was 0.00  →  correct 16,074,955,337.40
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 16074955337.4)
  WHERE meta_num = 147;

-- meta 149: was 0.00  →  correct 65,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 65000000.0)
  WHERE meta_num = 149;

-- meta 151: was 914,614,790.12  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 151;

-- meta 152: was 330,191,250.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 152;

-- meta 153: was 0.00  →  correct 914,614,790.12
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 914614790.12)
  WHERE meta_num = 153;

-- meta 154: was 106,040,850.00  →  correct 330,191,250.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 330191250.0)
  WHERE meta_num = 154;

-- meta 155: was 220,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 155;

-- meta 156: was 59,998,800.00  →  correct 106,040,850.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 106040850.0)
  WHERE meta_num = 156;

-- meta 157: was 108,410,950.00  →  correct 220,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 220000000.0)
  WHERE meta_num = 157;

-- meta 158: was 0.00  →  correct 59,998,800.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 59998800.0)
  WHERE meta_num = 158;

-- meta 159: was 0.00  →  correct 108,410,950.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 108410950.0)
  WHERE meta_num = 159;

-- meta 161: was 40,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 161;

-- meta 162: was 805,423,770.15  →  correct 4,004,350,921.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 4004350921.0)
  WHERE meta_num = 162;

-- meta 163: was 0.00  →  correct 1,658,842,147.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1658842147.0)
  WHERE meta_num = 163;

-- meta 166: was 40,000,000.00  →  correct 1,601,317,068.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1601317068.0)
  WHERE meta_num = 166;

-- meta 168: was 0.00  →  correct 40,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 40000000.0)
  WHERE meta_num = 168;

-- meta 169: was 0.00  →  correct 679,831,402.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 679831402.0)
  WHERE meta_num = 169;

-- meta 170: was 10,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 170;

-- meta 174: was 4,500,000,000.00  →  correct 0.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 0)
  WHERE meta_num = 174;

-- meta 175: was 0.00  →  correct 7,318,260,832.36
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 7318260832.36)
  WHERE meta_num = 175;

-- meta 177: was 53,000,000.00  →  correct 119,638,306,186.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 119638306186.0)
  WHERE meta_num = 177;

-- meta 179: was 1,150,061,134.35  →  correct 53,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 53000000.0)
  WHERE meta_num = 179;

-- meta 180: was 295,283,035.00  →  correct 106,860,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 106860000.0)
  WHERE meta_num = 180;

-- meta 181: was 359,937,101.00  →  correct 1,150,061,134.35
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1150061134.35)
  WHERE meta_num = 181;

-- meta 182: was 103,400,000.00  →  correct 295,283,035.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 295283035.0)
  WHERE meta_num = 182;

-- meta 183: was 105,640,000.00  →  correct 359,937,101.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 359937101.0)
  WHERE meta_num = 183;

-- meta 184: was 393,661,365.82  →  correct 103,400,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 103400000.0)
  WHERE meta_num = 184;

-- meta 185: was 227,230,149.00  →  correct 105,640,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 105640000.0)
  WHERE meta_num = 185;

-- meta 186: was 49,280,000.00  →  correct 393,661,365.82
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 393661365.82)
  WHERE meta_num = 186;

-- meta 187: was 204,246,625.00  →  correct 227,230,149.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 227230149.0)
  WHERE meta_num = 187;

-- meta 188: was 567,320,000.00  →  correct 49,280,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 49280000.0)
  WHERE meta_num = 188;

-- meta 189: was 155,366,517.00  →  correct 204,246,625.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 204246625.0)
  WHERE meta_num = 189;

-- meta 190: was 327,827,168.00  →  correct 807,320,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 807320000.0)
  WHERE meta_num = 190;

-- meta 191: was 1,211,827,100.00  →  correct 155,366,517.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 155366517.0)
  WHERE meta_num = 191;

-- meta 193: was 134,315,000.00  →  correct 327,827,168.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 327827168.0)
  WHERE meta_num = 193;

-- meta 194: was 17,440,956,032.99  →  correct 1,211,827,100.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 1211827100.0)
  WHERE meta_num = 194;

-- meta 195: was 141,154,950.00  →  correct 134,315,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 134315000.0)
  WHERE meta_num = 195;

-- meta 196: was 28,000,000.00  →  correct 17,440,956,032.99
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 17440956032.99)
  WHERE meta_num = 196;

-- meta 197: was 31,868,210.00  →  correct 141,154,950.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 141154950.0)
  WHERE meta_num = 197;

-- meta 198: was 0.00  →  correct 28,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 28000000.0)
  WHERE meta_num = 198;

-- meta 199: was 162,000,000.00  →  correct 31,868,210.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 31868210.0)
  WHERE meta_num = 199;

-- meta 203: was 0.00  →  correct 45,000,000.00
UPDATE pdm_metas
  SET presupuesto_2026 = COALESCE(presupuesto_2026, '{}') || jsonb_build_object('total_apropiacion', 45000000.0)
  WHERE meta_num = 203;

COMMIT;
-- Total updates: 162 metas