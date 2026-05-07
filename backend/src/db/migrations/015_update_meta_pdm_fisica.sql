-- Migration 015: Actualización de meta_pdm y meta_fisica para todos los años
-- Fuente: tabla provista por usuario (204 metas, valores exactos)
-- NP / vacío = NULL

BEGIN;

UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=2, meta_pdm_2025=4, meta_fisica_2025=4, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=1;
UPDATE pdm_metas SET meta_pdm_2024=100, meta_fisica_2024=100, meta_pdm_2025=100, meta_fisica_2025=100, meta_pdm_2026=100, meta_fisica_2026=91, meta_pdm_2027=100, meta_fisica_2027=0 WHERE meta_num=2;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=4, meta_fisica_2025=4, meta_pdm_2026=4, meta_fisica_2026=0, meta_pdm_2027=4, meta_fisica_2027=0 WHERE meta_num=3;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=4;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=0.33, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=5;
UPDATE pdm_metas SET meta_pdm_2024=50, meta_fisica_2024=50, meta_pdm_2025=70, meta_fisica_2025=105, meta_pdm_2026=70, meta_fisica_2026=28, meta_pdm_2027=90, meta_fisica_2027=0 WHERE meta_num=6;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=7;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=100, meta_fisica_2025=105, meta_pdm_2026=100, meta_fisica_2026=0, meta_pdm_2027=50, meta_fisica_2027=0 WHERE meta_num=8;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=0.25, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=9;
UPDATE pdm_metas SET meta_pdm_2024=1000, meta_fisica_2024=1000, meta_pdm_2025=1000, meta_fisica_2025=350, meta_pdm_2026=1000, meta_fisica_2026=295, meta_pdm_2027=1000, meta_fisica_2027=0 WHERE meta_num=10;
UPDATE pdm_metas SET meta_pdm_2024=1200, meta_fisica_2024=0, meta_pdm_2025=1200, meta_fisica_2025=1300, meta_pdm_2026=1200, meta_fisica_2026=295, meta_pdm_2027=1200, meta_fisica_2027=0 WHERE meta_num=11;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=0, meta_fisica_2025=0, meta_pdm_2026=0.33, meta_fisica_2026=0.33, meta_pdm_2027=0.3, meta_fisica_2027=0 WHERE meta_num=12;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=1, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=13;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=14;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=0, meta_fisica_2025=0, meta_pdm_2026=0.7, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=15;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=0, meta_fisica_2025=0, meta_pdm_2026=0.33, meta_fisica_2026=0, meta_pdm_2027=0.4, meta_fisica_2027=0 WHERE meta_num=16;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=0, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=2.5, meta_fisica_2026=0, meta_pdm_2027=2.5, meta_fisica_2027=0 WHERE meta_num=17;
UPDATE pdm_metas SET meta_pdm_2024=10, meta_fisica_2024=10, meta_pdm_2025=10, meta_fisica_2025=10, meta_pdm_2026=10, meta_fisica_2026=4, meta_pdm_2027=10, meta_fisica_2027=0 WHERE meta_num=18;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=19;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=0.25, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=20;
UPDATE pdm_metas SET meta_pdm_2024=100, meta_fisica_2024=100, meta_pdm_2025=100, meta_fisica_2025=100, meta_pdm_2026=100, meta_fisica_2026=91, meta_pdm_2027=100, meta_fisica_2027=0 WHERE meta_num=21;
UPDATE pdm_metas SET meta_pdm_2024=100, meta_fisica_2024=100, meta_pdm_2025=100, meta_fisica_2025=100, meta_pdm_2026=100, meta_fisica_2026=0, meta_pdm_2027=100, meta_fisica_2027=0 WHERE meta_num=22;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.91, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=23;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=24;
UPDATE pdm_metas SET meta_pdm_2024=8, meta_fisica_2024=12, meta_pdm_2025=8, meta_fisica_2025=11, meta_pdm_2026=8, meta_fisica_2026=8, meta_pdm_2027=8, meta_fisica_2027=0 WHERE meta_num=25;
UPDATE pdm_metas SET meta_pdm_2024=12, meta_fisica_2024=12, meta_pdm_2025=12, meta_fisica_2025=12, meta_pdm_2026=12, meta_fisica_2026=3, meta_pdm_2027=12, meta_fisica_2027=0 WHERE meta_num=26;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=2, meta_pdm_2025=2, meta_fisica_2025=2, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=27;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=8, meta_fisica_2025=8, meta_pdm_2026=8, meta_fisica_2026=0, meta_pdm_2027=8, meta_fisica_2027=0 WHERE meta_num=28;
UPDATE pdm_metas SET meta_pdm_2024=6, meta_fisica_2024=6, meta_pdm_2025=10, meta_fisica_2025=10, meta_pdm_2026=10, meta_fisica_2026=0, meta_pdm_2027=6, meta_fisica_2027=0 WHERE meta_num=29;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=0.42, meta_pdm_2027=0.25, meta_fisica_2027=0 WHERE meta_num=30;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=31;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=2, meta_pdm_2025=2, meta_fisica_2025=2, meta_pdm_2026=2, meta_fisica_2026=2, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=32;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=33;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=34;
UPDATE pdm_metas SET meta_pdm_2024=252967, meta_fisica_2024=196200, meta_pdm_2025=255450, meta_fisica_2025=255450, meta_pdm_2026=255450, meta_fisica_2026=0, meta_pdm_2027=257933, meta_fisica_2027=0 WHERE meta_num=35;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=2, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=36;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=0.2, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=37;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=0.27, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=38;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=2, meta_fisica_2025=0, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=39;
UPDATE pdm_metas SET meta_pdm_2024=70, meta_fisica_2024=70, meta_pdm_2025=70, meta_fisica_2025=70, meta_pdm_2026=70, meta_fisica_2026=0, meta_pdm_2027=40, meta_fisica_2027=0 WHERE meta_num=40;
UPDATE pdm_metas SET meta_pdm_2024=30, meta_fisica_2024=30, meta_pdm_2025=30, meta_fisica_2025=30, meta_pdm_2026=30, meta_fisica_2026=0, meta_pdm_2027=30, meta_fisica_2027=0 WHERE meta_num=41;
UPDATE pdm_metas SET meta_pdm_2024=6, meta_fisica_2024=6, meta_pdm_2025=6, meta_fisica_2025=6, meta_pdm_2026=6, meta_fisica_2026=0, meta_pdm_2027=6, meta_fisica_2027=0 WHERE meta_num=42;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=0.25, meta_fisica_2026=0.045, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=43;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=20, meta_fisica_2026=0, meta_pdm_2027=30, meta_fisica_2027=0 WHERE meta_num=44;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=45;
UPDATE pdm_metas SET meta_pdm_2024=120, meta_fisica_2024=120, meta_pdm_2025=120, meta_fisica_2025=120, meta_pdm_2026=120, meta_fisica_2026=0, meta_pdm_2027=100, meta_fisica_2027=0 WHERE meta_num=46;
UPDATE pdm_metas SET meta_pdm_2024=27, meta_fisica_2024=0, meta_pdm_2025=30, meta_fisica_2025=30, meta_pdm_2026=30, meta_fisica_2026=0, meta_pdm_2027=30, meta_fisica_2027=0 WHERE meta_num=47;
UPDATE pdm_metas SET meta_pdm_2024=26, meta_fisica_2024=26, meta_pdm_2025=26, meta_fisica_2025=26, meta_pdm_2026=26, meta_fisica_2026=0, meta_pdm_2027=26, meta_fisica_2027=0 WHERE meta_num=48;
UPDATE pdm_metas SET meta_pdm_2024=10, meta_fisica_2024=10, meta_pdm_2025=10, meta_fisica_2025=10, meta_pdm_2026=10, meta_fisica_2026=0, meta_pdm_2027=10, meta_fisica_2027=0 WHERE meta_num=49;
UPDATE pdm_metas SET meta_pdm_2024=50, meta_fisica_2024=177, meta_pdm_2025=50, meta_fisica_2025=230, meta_pdm_2026=227, meta_fisica_2026=0, meta_pdm_2027=50, meta_fisica_2027=0 WHERE meta_num=50;
UPDATE pdm_metas SET meta_pdm_2024=50, meta_fisica_2024=0, meta_pdm_2025=50, meta_fisica_2025=100, meta_pdm_2026=100, meta_fisica_2026=0, meta_pdm_2027=50, meta_fisica_2027=0 WHERE meta_num=51;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=6, meta_fisica_2025=6, meta_pdm_2026=6, meta_fisica_2026=6, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=52;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=53;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=54;
UPDATE pdm_metas SET meta_pdm_2024=2500, meta_fisica_2024=0, meta_pdm_2025=2500, meta_fisica_2025=8726, meta_pdm_2026=2500, meta_fisica_2026=1248, meta_pdm_2027=2500, meta_fisica_2027=0 WHERE meta_num=55;
UPDATE pdm_metas SET meta_pdm_2024=25, meta_fisica_2024=0, meta_pdm_2025=25, meta_fisica_2025=25, meta_pdm_2026=25, meta_fisica_2026=2, meta_pdm_2027=25, meta_fisica_2027=0 WHERE meta_num=56;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=57;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=0, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=3, meta_fisica_2026=3, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=58;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=59;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=0, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=60;
UPDATE pdm_metas SET meta_pdm_2024=20, meta_fisica_2024=2, meta_pdm_2025=39, meta_fisica_2025=28, meta_pdm_2026=0.5, meta_fisica_2026=0, meta_pdm_2027=20, meta_fisica_2027=0 WHERE meta_num=61;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=4, meta_fisica_2025=4, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=62;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=63;
UPDATE pdm_metas SET meta_pdm_2024=20, meta_fisica_2024=0, meta_pdm_2025=80, meta_fisica_2025=0, meta_pdm_2026=0, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=64;
UPDATE pdm_metas SET meta_pdm_2024=12500, meta_fisica_2024=1000, meta_pdm_2025=12500, meta_fisica_2025=8100, meta_pdm_2026=12500, meta_fisica_2026=8327, meta_pdm_2027=12500, meta_fisica_2027=0 WHERE meta_num=65;
UPDATE pdm_metas SET meta_pdm_2024=173, meta_fisica_2024=100, meta_pdm_2025=75, meta_fisica_2025=85, meta_pdm_2026=75, meta_fisica_2026=0, meta_pdm_2027=77, meta_fisica_2027=0 WHERE meta_num=66;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=10, meta_fisica_2025=10, meta_pdm_2026=10, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=67;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=0, meta_pdm_2025=6, meta_fisica_2025=20, meta_pdm_2026=12, meta_fisica_2026=12, meta_pdm_2027=6, meta_fisica_2027=0 WHERE meta_num=68;
UPDATE pdm_metas SET meta_pdm_2024=4, meta_fisica_2024=0, meta_pdm_2025=12, meta_fisica_2025=16, meta_pdm_2026=24, meta_fisica_2026=0, meta_pdm_2027=12, meta_fisica_2027=0 WHERE meta_num=69;
UPDATE pdm_metas SET meta_pdm_2024=30, meta_fisica_2024=0, meta_pdm_2025=30, meta_fisica_2025=144, meta_pdm_2026=60, meta_fisica_2026=0, meta_pdm_2027=30, meta_fisica_2027=0 WHERE meta_num=70;
UPDATE pdm_metas SET meta_pdm_2024=15, meta_fisica_2024=15, meta_pdm_2025=15, meta_fisica_2025=35, meta_pdm_2026=15, meta_fisica_2026=0, meta_pdm_2027=15, meta_fisica_2027=0 WHERE meta_num=71;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=72;
UPDATE pdm_metas SET meta_pdm_2024=523, meta_fisica_2024=523, meta_pdm_2025=450, meta_fisica_2025=579, meta_pdm_2026=450, meta_fisica_2026=204, meta_pdm_2027=577, meta_fisica_2027=0 WHERE meta_num=73;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=74;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=1.5, meta_fisica_2027=0 WHERE meta_num=75;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=76;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=77;
UPDATE pdm_metas SET meta_pdm_2024=12, meta_fisica_2024=3, meta_pdm_2025=12, meta_fisica_2025=4, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=12, meta_fisica_2027=0 WHERE meta_num=78;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=79;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=80;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=150, meta_fisica_2025=0, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=30, meta_fisica_2027=0 WHERE meta_num=81;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=82;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=2, meta_pdm_2025=6, meta_fisica_2025=6, meta_pdm_2026=6, meta_fisica_2026=0, meta_pdm_2027=6, meta_fisica_2027=0 WHERE meta_num=83;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=84;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=85;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=10, meta_fisica_2025=30, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=10, meta_fisica_2027=0 WHERE meta_num=86;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=3, meta_fisica_2025=0, meta_pdm_2026=0, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=87;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=0, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=88;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=3, meta_fisica_2025=4, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=89;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=0, meta_pdm_2025=2, meta_fisica_2025=2, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=90;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=91;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=92;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=0, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=93;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=94;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=95;
UPDATE pdm_metas SET meta_pdm_2024=15, meta_fisica_2024=0, meta_pdm_2025=18, meta_fisica_2025=18, meta_pdm_2026=18, meta_fisica_2026=3, meta_pdm_2027=7, meta_fisica_2027=0 WHERE meta_num=96;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=97;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=98;
UPDATE pdm_metas SET meta_pdm_2024=5, meta_fisica_2024=5, meta_pdm_2025=5, meta_fisica_2025=5, meta_pdm_2026=5, meta_fisica_2026=0, meta_pdm_2027=5, meta_fisica_2027=0 WHERE meta_num=99;
UPDATE pdm_metas SET meta_pdm_2024=1500, meta_fisica_2024=336, meta_pdm_2025=1500, meta_fisica_2025=1649, meta_pdm_2026=1500, meta_fisica_2026=0, meta_pdm_2027=1500, meta_fisica_2027=0 WHERE meta_num=100;
UPDATE pdm_metas SET meta_pdm_2024=80, meta_fisica_2024=40, meta_pdm_2025=60, meta_fisica_2025=64, meta_pdm_2026=70, meta_fisica_2026=0, meta_pdm_2027=70, meta_fisica_2027=0 WHERE meta_num=101;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=102;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=50, meta_fisica_2025=60, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=103;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=15, meta_fisica_2025=31, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=104;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=105;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=60, meta_fisica_2025=60, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=106;
UPDATE pdm_metas SET meta_pdm_2024=17500, meta_fisica_2024=20000, meta_pdm_2025=17500, meta_fisica_2025=131605, meta_pdm_2026=90000, meta_fisica_2026=0, meta_pdm_2027=17500, meta_fisica_2027=0 WHERE meta_num=107;
UPDATE pdm_metas SET meta_pdm_2024=2250, meta_fisica_2024=2250, meta_pdm_2025=2250, meta_fisica_2025=2931, meta_pdm_2026=2250, meta_fisica_2026=0, meta_pdm_2027=2250, meta_fisica_2027=0 WHERE meta_num=108;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=2, meta_pdm_2025=2, meta_fisica_2025=2, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=109;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=110;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=111;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=112;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=113;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=114;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=1, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=115;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=116;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=117;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.25, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=118;
UPDATE pdm_metas SET meta_pdm_2024=150, meta_fisica_2024=52, meta_pdm_2025=150, meta_fisica_2025=302, meta_pdm_2026=150, meta_fisica_2026=0, meta_pdm_2027=150, meta_fisica_2027=0 WHERE meta_num=119;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=1, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=120;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=0.25, meta_fisica_2026=0.08, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=121;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=4, meta_fisica_2025=4, meta_pdm_2026=4, meta_fisica_2026=1.33, meta_pdm_2027=4, meta_fisica_2027=0 WHERE meta_num=122;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.33, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=123;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.33, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=124;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=2, meta_pdm_2025=2, meta_fisica_2025=2, meta_pdm_2026=2, meta_fisica_2026=0.67, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=125;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=2, meta_pdm_2026=1, meta_fisica_2026=0.33, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=126;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.33, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=127;
UPDATE pdm_metas SET meta_pdm_2024=300, meta_fisica_2024=100, meta_pdm_2025=300, meta_fisica_2025=300, meta_pdm_2026=300, meta_fisica_2026=100, meta_pdm_2027=300, meta_fisica_2027=0 WHERE meta_num=128;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=0.75, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=129;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=0, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=130;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=333, meta_fisica_2025=0, meta_pdm_2026=333, meta_fisica_2026=0, meta_pdm_2027=334, meta_fisica_2027=0 WHERE meta_num=131;
UPDATE pdm_metas SET meta_pdm_2024=13, meta_fisica_2024=13, meta_pdm_2025=13, meta_fisica_2025=13, meta_pdm_2026=13, meta_fisica_2026=13, meta_pdm_2027=13, meta_fisica_2027=0 WHERE meta_num=132;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=3, meta_fisica_2025=4, meta_pdm_2026=3, meta_fisica_2026=1, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=133;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=3, meta_pdm_2025=5, meta_fisica_2025=5, meta_pdm_2026=6, meta_fisica_2026=0, meta_pdm_2027=6, meta_fisica_2027=0 WHERE meta_num=134;
UPDATE pdm_metas SET meta_pdm_2024=10000, meta_fisica_2024=1234, meta_pdm_2025=10000, meta_fisica_2025=10000, meta_pdm_2026=10000, meta_fisica_2026=843, meta_pdm_2027=10000, meta_fisica_2027=0 WHERE meta_num=135;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=136;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=7, meta_pdm_2025=5, meta_fisica_2025=7, meta_pdm_2026=6, meta_fisica_2026=0, meta_pdm_2027=6, meta_fisica_2027=0 WHERE meta_num=137;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=138;
UPDATE pdm_metas SET meta_pdm_2024=7, meta_fisica_2024=7, meta_pdm_2025=7, meta_fisica_2025=7, meta_pdm_2026=7, meta_fisica_2026=7, meta_pdm_2027=7, meta_fisica_2027=0 WHERE meta_num=139;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=140;
UPDATE pdm_metas SET meta_pdm_2024=150, meta_fisica_2024=150, meta_pdm_2025=150, meta_fisica_2025=150, meta_pdm_2026=150, meta_fisica_2026=28, meta_pdm_2027=150, meta_fisica_2027=0 WHERE meta_num=141;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=1, meta_pdm_2025=2, meta_fisica_2025=3, meta_pdm_2026=2.5, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=142;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=2.5, meta_fisica_2027=0 WHERE meta_num=143;
UPDATE pdm_metas SET meta_pdm_2024=2, meta_fisica_2024=1, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=144;
UPDATE pdm_metas SET meta_pdm_2024=4, meta_fisica_2024=4, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=145;
UPDATE pdm_metas SET meta_pdm_2024=10, meta_fisica_2024=NULL, meta_pdm_2025=10, meta_fisica_2025=20, meta_pdm_2026=40, meta_fisica_2026=0, meta_pdm_2027=40, meta_fisica_2027=0 WHERE meta_num=146;
UPDATE pdm_metas SET meta_pdm_2024=1750, meta_fisica_2024=1750, meta_pdm_2025=1750, meta_fisica_2025=2244, meta_pdm_2026=175, meta_fisica_2026=103, meta_pdm_2027=1750, meta_fisica_2027=0 WHERE meta_num=147;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=2, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=149;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=150;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=2, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=151;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=60, meta_fisica_2025=0, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=152;
UPDATE pdm_metas SET meta_pdm_2024=250, meta_fisica_2024=250, meta_pdm_2025=250, meta_fisica_2025=250, meta_pdm_2026=250, meta_fisica_2026=1600, meta_pdm_2027=250, meta_fisica_2027=0 WHERE meta_num=153;
UPDATE pdm_metas SET meta_pdm_2024=1250, meta_fisica_2024=1000, meta_pdm_2025=1250, meta_fisica_2025=250, meta_pdm_2026=2250, meta_fisica_2026=87.22, meta_pdm_2027=1250, meta_fisica_2027=0 WHERE meta_num=154;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=155;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.21, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=156;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=157;
UPDATE pdm_metas SET meta_pdm_2024=1800, meta_fisica_2024=1000, meta_pdm_2025=400, meta_fisica_2025=400, meta_pdm_2026=1000, meta_fisica_2026=0, meta_pdm_2027=400, meta_fisica_2027=0 WHERE meta_num=158;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=1, meta_fisica_2026=0.21, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=159;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=160;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=0, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=161;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=3, meta_fisica_2025=3, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=162;
UPDATE pdm_metas SET meta_pdm_2024=13500, meta_fisica_2024=13500, meta_pdm_2025=13500, meta_fisica_2025=13500, meta_pdm_2026=13500, meta_fisica_2026=0, meta_pdm_2027=13500, meta_fisica_2027=0 WHERE meta_num=163;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=20, meta_fisica_2025=0, meta_pdm_2026=20, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=164;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=2, meta_fisica_2025=0, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=165;
UPDATE pdm_metas SET meta_pdm_2024=12500, meta_fisica_2024=12500, meta_pdm_2025=12500, meta_fisica_2025=12500, meta_pdm_2026=12500, meta_fisica_2026=0, meta_pdm_2027=12500, meta_fisica_2027=0 WHERE meta_num=166;
UPDATE pdm_metas SET meta_pdm_2024=0, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=0.3, meta_fisica_2027=0 WHERE meta_num=167;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=168;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=169;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=170;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=172;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=173;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=174;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=0, meta_pdm_2026=2, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=175;
UPDATE pdm_metas SET meta_pdm_2024=2000, meta_fisica_2024=2000, meta_pdm_2025=1000, meta_fisica_2025=1998, meta_pdm_2026=1000, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=176;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.09, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=177;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=178;
UPDATE pdm_metas SET meta_pdm_2024=18, meta_fisica_2024=18, meta_pdm_2025=18, meta_fisica_2025=18, meta_pdm_2026=18, meta_fisica_2026=4.63, meta_pdm_2027=18, meta_fisica_2027=0 WHERE meta_num=179;
UPDATE pdm_metas SET meta_pdm_2024=150, meta_fisica_2024=150, meta_pdm_2025=150, meta_fisica_2025=348, meta_pdm_2026=150, meta_fisica_2026=38, meta_pdm_2027=150, meta_fisica_2027=0 WHERE meta_num=180;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=181;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=182;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=183;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=184;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=185;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=186;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=187;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=188;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.27, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=189;
UPDATE pdm_metas SET meta_pdm_2024=25, meta_fisica_2024=64, meta_pdm_2025=25, meta_fisica_2025=19, meta_pdm_2026=10, meta_fisica_2026=0.45, meta_pdm_2027=25, meta_fisica_2027=0 WHERE meta_num=190;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.18, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=191;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=0, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0.068, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=193;
UPDATE pdm_metas SET meta_pdm_2024=375, meta_fisica_2024=0, meta_pdm_2025=375, meta_fisica_2025=375, meta_pdm_2026=375, meta_fisica_2026=25, meta_pdm_2027=375, meta_fisica_2027=0 WHERE meta_num=194;
UPDATE pdm_metas SET meta_pdm_2024=800, meta_fisica_2024=748, meta_pdm_2025=672, meta_fisica_2025=200, meta_pdm_2026=200, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=195;
UPDATE pdm_metas SET meta_pdm_2024=800, meta_fisica_2024=410, meta_pdm_2025=672, meta_fisica_2025=500, meta_pdm_2026=474, meta_fisica_2026=0, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=196;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=500, meta_fisica_2025=500, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=197;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=198;
UPDATE pdm_metas SET meta_pdm_2024=1, meta_fisica_2024=1, meta_pdm_2025=1, meta_fisica_2025=1, meta_pdm_2026=1, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=199;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=200;
UPDATE pdm_metas SET meta_pdm_2024=34, meta_fisica_2024=1, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=108, meta_fisica_2026=0, meta_pdm_2027=108, meta_fisica_2027=0 WHERE meta_num=201;
UPDATE pdm_metas SET meta_pdm_2024=40, meta_fisica_2024=3, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=NULL, meta_fisica_2026=NULL, meta_pdm_2027=NULL, meta_fisica_2027=0 WHERE meta_num=202;
UPDATE pdm_metas SET meta_pdm_2024=3, meta_fisica_2024=3, meta_pdm_2025=3, meta_fisica_2025=2, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=203;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=1, meta_fisica_2026=NULL, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=204;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=4, meta_fisica_2026=0, meta_pdm_2027=1, meta_fisica_2027=0 WHERE meta_num=205;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=3, meta_fisica_2026=0, meta_pdm_2027=2, meta_fisica_2027=0 WHERE meta_num=206;
UPDATE pdm_metas SET meta_pdm_2024=NULL, meta_fisica_2024=NULL, meta_pdm_2025=NULL, meta_fisica_2025=NULL, meta_pdm_2026=4, meta_fisica_2026=0, meta_pdm_2027=3, meta_fisica_2027=0 WHERE meta_num=207;

-- Recalcular eficiencia anual
UPDATE pdm_metas SET
  eficiencia_2024 = meta_fisica_2024::numeric / NULLIF(meta_pdm_2024::numeric, 0),
  eficiencia_2025 = meta_fisica_2025::numeric / NULLIF(meta_pdm_2025::numeric, 0),
  eficiencia_2026 = meta_fisica_2026::numeric / NULLIF(meta_pdm_2026::numeric, 0),
  eficiencia_2027 = meta_fisica_2027::numeric / NULLIF(meta_pdm_2027::numeric, 0)
WHERE meta_num IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207);

-- Recalcular avance_fisico y cumplimiento_cuatrienio
UPDATE pdm_metas SET
  avance_fisico = (
    COALESCE(meta_fisica_2024::numeric,0)+COALESCE(meta_fisica_2025::numeric,0)+
    COALESCE(meta_fisica_2026::numeric,0)+COALESCE(meta_fisica_2027::numeric,0)
  ) / NULLIF(meta_cuatrienio::numeric, 0),
  cumplimiento_cuatrienio = (
    COALESCE(meta_fisica_2024::numeric,0)+COALESCE(meta_fisica_2025::numeric,0)+
    COALESCE(meta_fisica_2026::numeric,0)+COALESCE(meta_fisica_2027::numeric,0)
  ) / NULLIF(meta_cuatrienio::numeric, 0) * 100
WHERE meta_num IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207)
  AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0;

COMMIT;
-- Total metas actualizadas: 204