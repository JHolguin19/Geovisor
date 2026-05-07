"""
Genera migration 015: UPDATE meta_pdm y meta_fisica para todos los años.
NP / vacío => NULL. Comas de miles eliminadas. Coma decimal europea convertida.
"""
import re

RAW = """1	2	2	4	4	2	0	2	0
2	100	100	100	100	100	91	100	0
3	NP	NP	4	4	4	0	4	0
4	1	1	1	1	1	0	1	0
5	NP	NP	1	1	0.33	0	1	0
6	50	50	70	105	70	28	90	0
7	NP	NP	2	1	1	0	1	0
8	NP	NP	100	105	100	0	50	0
9	NP	NP	1	1	0.25	0	1	0
10	1,000	1000	1000	350	1000	295	1000	0
11	1,200	0	1200	1300	1200	295	1200	0
12	NP	NP	0	0	0.33	0.33	0.3	0
13	1	0	1	1	1	1	1	0
14	NP	NP	2	1	1	0	1	0
15	1	0	0	0	0.7	0	NP	0
16	NP	NP	0	0	0.33	0	0.4	0
17	3	0	3	3	2.5	0	2.5	0
18	10	10	10	10	10	4	10	0
19	NP	NP	2	1	1	0	1	0
20	1	1	1	1	0.25	0	1	0
21	100	100	100	100	100	91	100	0
22	100	100	100	100	100	0	100	0
23	1	1	1	1	1	0.91	1	0
24	NP	NP	1	1	1	0	NP	0
25	8	12	8	11	8	8	8	0
26	12	12	12	12	12	3	12	0
27	1	2	2	2	2	0	1	0
28	NP	NP	8	8	8	0	8	0
29	6	6	10	10	10	0	6	0
30	NP	NP	1		1	0.42	0.25	0
31	1	0	1	1	1	0	1	0
32	2	2	2	2	2	2	2	0
33	1	0	1	1	1	0	1	0
34	1	1	1	0	1	0	1	0
35	252,967	196200	255450	255450	255450	0	257933	0
36	2	2	1	1	1	0	NP	0
37	1	1	NP	NP	0.2	0	1	0
38	1	1	1	0	0.27	0	1	0
39	1	1	2	0	2	0	1	0
40	70	70	70	70	70	0	40	0
41	30	30	30	30	30	0	30	0
42	6	6	6	6	6	0	6	0
43	1	0	1	1	0.25	0.045	1	0
44	NP	NP	NP	NP	20	0	30	0
45	NP	NP	NP	NP	1	0	1	0
46	120	120	120	120	120	0	100	0
47	27	0	30	30	30	0	30	0
48	26	26	26	26	26	0	26	0
49	10	10	10	10	10	0	10	0
50	50	177	50	230	227	0	50	0
51	50	0	50	100	100	0	50	0
52	NP	NP	6	6	6	6	2	0
53	1	0	1	1	1	0	1	0
54	1	0	1	0	1	0	1	0
55	2,500	0	2500	8726	2500	1248	2500	0
56	25	0	25	25	25	2	25	0
57	NP	NP	1	0	2	0	NP	0
58	3	0	3	3	3	3	3	0
59	NP	NP	1	1	1	0	2	0
60	NP	NP	1	0	0	0	2	0
61	20	2	39	28	0.5	0	20	0
62	1	0	4	4	2	0	3	0
63	1	0	1	1	2	0	1	0
64	20	0	80	0	0	0	NP	0
65	12,500	1000	12500	8100	12500	8327	12500	0
66	173	100	75	85	75	0	77	0
67	NP	NP	10	10	10	0	NP	0
68	2	0	6	20	12	12	6	0
69	4	0	12	16	24	0	12	0
70	30	0	30	144	60	0	30	0
71	15	15	15	35	15	0	15	0
72	NP	NP	1		NP	NP	NP	0
73	523	523	450	579	450	204	577	0
74	1	1	1	1	1	0	1	0
75	NP	NP	3	3	3	0	1.5	0
76	NP	NP	NP	NP	3	0	2	0
77	1	0	1	1	1	0	1	0
78	12	3	12	4	3	0	12	0
79	NP	NP	1	1	1	0	1	0
80	NP	NP	NP	NP	NP	NP	NP	0
81	NP	NP	150	0	NP	NP	30	0
82	NP	NP	NP	NP	NP	NP	NP	0
83	2	2	6	6	6	0	6	0
84	NP	NP	1	1	NP	NP	NP	0
85	NP	NP	1	1	NP	NP	NP	0
86	NP	NP	10	30	NP	NP	10	0
87	NP	NP	3	0	0	0	2	0
88	NP	NP	2	0	NP	NP	NP	0
89	NP	NP	3	4	NP	NP	NP	0
90	2	0	2	2	2	0	1	0
91	NP	NP	NP	NP	NP	NP	NP	0
92	NP	NP	3	3	3	0	2	0
93	3	0	3	3	3	0	2	0
94	NP	NP	NP	NP	NP	NP	NP	0
95	NP	NP	1	1	1	0	1	0
96	15	0	18	18	18	3	7	0
97	NP	NP	1	1	NP	NP	NP	0
98	NP	NP	2	1	1	0	1	0
99	5	5	5	5	5	0	5	0
100	1,500	336	1500	1649	1500	0	1500	0
101	80	40	60	64	70	0	70	0
102	1	1	NP	NP	NP	NP	NP	0
103	NP	NP	50	60	NP	NP	NP	0
104	NP	NP	15	31	NP	NP	NP	0
105	NP	NP	1	1	NP	NP	NP	0
106	NP	NP	60	60	NP	NP	NP	0
107	17,500	20000	17500	131605	90000	0	17500	0
108	2,250	2250	2250	2931	2250	0	2250	0
109	2	2	2	2	2	0	NP	0
110	NP	NP	NP	NP	1	0	NP	0
111	NP	NP	NP	NP	NP	NP	NP	0
112	NP	NP	NP	NP	NP	NP	1	0
113	NP	NP	NP	NP	1	0	NP	0
114	1	1	NP	NP	NP	NP	NP	0
115	1	1	1	1	1	1	1	0
116	1	1	1	1	1	0	1	0
117	1	1	1	1	1	0	1	0
118	1	1	1	1	1	0.25	1	0
119	150	52	150	302	150	0	150	0
120	1	1	1	1	1	1	1	0
121	1	1	1	1	0.25	0.08	1	0
122	1	1	4	4	4	1.33	4	0
123	1	1	1	1	1	0.33	1	0
124	NP	NP	1	1	1	0.33	1	0
125	2	2	2	2	2	0.67	3	0
126	1	0	1	2	1	0.33	1	0
127	1	0	1	1	1	0.33	1	0
128	300	100	300	300	300	100	300	0
129	NP	NP	1	0	0.75	0	1	0
130	3	0	3	3	1	0	3	0
131	NP	NP	333	0	333	0	334	0
132	13	13	13	13	13	13	13	0
133	1	1	3	4	3	1	3	0
134	3	3	5	5	6	0	6	0
135	10,000	1234	10000	10000	10000	843	10000	0
136	1	NP	1	1	1	0	1	0
137	3	7	5	7	6	0	6	0
138	1	1	1	1	1	0	1	0
139	7	7	7	7	7	7	7	0
140	1	NP	1	1	1	0	NP	0
141	150	150	150	150	150	28	150	0
142	2	1	2	3	2.5	0	2	0
143	1	1	1	0	NP	NP	2.5	0
144	2	1	NP	NP	NP	NP	NP	0
145	4	4	NP	NP	NP	NP	NP	0
146	10	NP	10	20	40	0	40	0
147	1,750	1750	1750	2244	175	103	1750	0
149	1	1	1	2	2	0	1	0
150	NP	NP	1	1	NP	NP	NP	0
151	NP	NP	1	2	NP	NP	1	0
152	NP	NP	60	0	NP	NP	NP	0
153	250	250	250	250	250	1600	250	0
154	1,250	1000	1250	250	2250	87.22	1250	0
155	1	0	1	1	NP	NP	1	0
156	1	0	1	1	1	0.21	NP	0
157	1	0	1	1	1	0	NP	0
158	1,800	1000	400	400	1000	0	400	0
159	1	0	1	0	1	0.21	NP	0
160	NP	NP	NP	NP	NP	NP	NP	0
161	NP	NP	2	0	NP	NP	1	0
162	1	1	3	3	1	0	1	0
163	13,500	13500	13500	13500	13500	0	13500	0
164	NP	NP	20	0	20	0	NP	0
165	NP	NP	2	0	NP	NP	NP	0
166	12,500	12500	12500	12500	12500	0	12500	0
167	0	0	1	0	1	0	0.3	0
168	NP	NP	1	0	1	0	NP	0
169	NP	NP	1	0	1	0	NP	0
170	NP	NP	NP	NP	NP	NP	1	0
172	NP	NP	NP	NP	1	0	NP	0
173	NP	NP	NP	NP	1	0	NP	0
174	NP	NP	NP	NP	NP	NP	1	0
175	1	1	1	0	2	0	NP	0
176	2,000	2000	1000	1998	1000	0	NP	0
177	1	1	1	1	1	0.09	1	0
178	NP	NP	NP	NP	NP	NP	1	0
179	18	18	18	18	18	4.63	18	0
180	150	150	150	348	150	38	150	0
181	1	1	1	1	1	0.27	1	0
182	1	1	1	1	1	0.27	1	0
183	1	1	1	1	1	0.27	1	0
184	1	1	1	1	1	0.27	1	0
185	1	1	1	1	1	0.27	1	0
186	1	1	1	1	1	0.27	1	0
187	1	1	1	1	1	0.27	1	0
188	1	1	1	1	1	0.27	1	0
189	1	1	1	1	1	0.27	1	0
190	25	64	25	19	10	0.45	25	0
191	1	1	1	1	1	0.18	1	0
193	1	0	1	1	1	0.068	1	0
194	375	0	375	375	375	25	375	0
195	800	748	672	200	200	0	NP	0
196	800	410	672	500	474	0	NP	0
197	1	1	500	500	1	0	1	0
198	1	1	1	1	1	0	1	0
199	1	1	1	1	1	0	1	0
200	NP	NP	NP	NP	NP	NP	1	0
201	34	1	NP	NP	108	0	108	0
202	40	3	NP	NP	NP	NP	NP	0
203	3	3	3	2	3	0	3	0
204	NP	NP	NP	NP	1	NP	1	0
205	NP	NP	NP	NP	4.00	0	1.00	0
206	NP	NP	NP	NP	3.00	0	2.00	0
207	NP	NP	NP	NP	4.00	0	3.00	0"""

def parse_val(s):
    s = s.strip()
    if s in ('NP', '', 'N/A', '-'):
        return None
    # Remove thousands comma (e.g. "1,000" -> "1000", "252,967" -> "252967")
    # But NOT decimal comma like "4,00" -> already replaced to "4.00" in data
    # Detect: if there's a comma and it's NOT a decimal separator
    # A thousands comma has digits on both sides and 3 digits after
    cleaned = re.sub(r',(?=\d{3}(?!\d))', '', s)  # remove thousands comma
    cleaned = cleaned.replace(',', '.')  # fallback: any remaining comma = decimal
    try:
        f = float(cleaned)
        return f
    except:
        return None

def sql_val(v):
    if v is None:
        return 'NULL'
    if v == int(v):
        return str(int(v))
    return str(v)

rows = []
for line in RAW.strip().split('\n'):
    parts = line.split('\t')
    if len(parts) < 9:
        parts += [''] * (9 - len(parts))
    meta_num = int(parts[0].strip())
    pdm24  = parse_val(parts[1])
    fis24  = parse_val(parts[2])
    pdm25  = parse_val(parts[3])
    fis25  = parse_val(parts[4])
    pdm26  = parse_val(parts[5])
    fis26  = parse_val(parts[6])
    pdm27  = parse_val(parts[7])
    fis27  = parse_val(parts[8])
    rows.append((meta_num, pdm24, fis24, pdm25, fis25, pdm26, fis26, pdm27, fis27))

lines = []
lines.append('-- Migration 015: Actualización de meta_pdm y meta_fisica para todos los años')
lines.append('-- Fuente: tabla provista por usuario (204 metas, valores exactos)')
lines.append('-- NP / vacío = NULL')
lines.append('')
lines.append('BEGIN;')
lines.append('')

meta_nums_updated = []
for (mn, pdm24, fis24, pdm25, fis25, pdm26, fis26, pdm27, fis27) in rows:
    meta_nums_updated.append(mn)
    lines.append(
        f'UPDATE pdm_metas SET '
        f'meta_pdm_2024={sql_val(pdm24)}, meta_fisica_2024={sql_val(fis24)}, '
        f'meta_pdm_2025={sql_val(pdm25)}, meta_fisica_2025={sql_val(fis25)}, '
        f'meta_pdm_2026={sql_val(pdm26)}, meta_fisica_2026={sql_val(fis26)}, '
        f'meta_pdm_2027={sql_val(pdm27)}, meta_fisica_2027={sql_val(fis27)} '
        f'WHERE meta_num={mn};'
    )

lines.append('')
# Recalcular eficiencia para todas las metas actualizadas
mn_list = ','.join(str(m) for m in meta_nums_updated)
lines.append('-- Recalcular eficiencia anual')
lines.append(f"""UPDATE pdm_metas SET
  eficiencia_2024 = meta_fisica_2024::numeric / NULLIF(meta_pdm_2024::numeric, 0),
  eficiencia_2025 = meta_fisica_2025::numeric / NULLIF(meta_pdm_2025::numeric, 0),
  eficiencia_2026 = meta_fisica_2026::numeric / NULLIF(meta_pdm_2026::numeric, 0),
  eficiencia_2027 = meta_fisica_2027::numeric / NULLIF(meta_pdm_2027::numeric, 0)
WHERE meta_num IN ({mn_list});""")

lines.append('')
lines.append('-- Recalcular avance_fisico y cumplimiento_cuatrienio')
lines.append(f"""UPDATE pdm_metas SET
  avance_fisico = (
    COALESCE(meta_fisica_2024::numeric,0)+COALESCE(meta_fisica_2025::numeric,0)+
    COALESCE(meta_fisica_2026::numeric,0)+COALESCE(meta_fisica_2027::numeric,0)
  ) / NULLIF(meta_cuatrienio::numeric, 0),
  cumplimiento_cuatrienio = (
    COALESCE(meta_fisica_2024::numeric,0)+COALESCE(meta_fisica_2025::numeric,0)+
    COALESCE(meta_fisica_2026::numeric,0)+COALESCE(meta_fisica_2027::numeric,0)
  ) / NULLIF(meta_cuatrienio::numeric, 0) * 100
WHERE meta_num IN ({mn_list})
  AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0;""")

lines.append('')
lines.append('COMMIT;')
lines.append(f'-- Total metas actualizadas: {len(rows)}')

out_path = '../src/db/migrations/015_update_meta_pdm_fisica.sql'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'Generado: {out_path} ({len(rows)} UPDATEs)')
# Spot-check
for mn, pdm24, fis24, pdm25, fis25, pdm26, fis26, pdm27, fis27 in rows[:5]:
    print(f'  meta {mn}: pdm24={pdm24} fis24={fis24} pdm25={pdm25} fis25={fis25} pdm26={pdm26} fis26={fis26} pdm27={pdm27} fis27={fis27}')
print(f'  meta 205: {rows[-3]}')
print(f'  meta 35 (252,967): {[r for r in rows if r[0]==35]}')
