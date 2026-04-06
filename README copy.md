# GeoVisor Municipal - Alcaldía de Santander de Quilichao

Sistema de información geográfica para las 14 secretarías del municipio de Santander de Quilichao, Cauca, Colombia.

## Arquitectura

- **Frontend:** React + OpenLayers + Vite
- **Backend:** Node.js + Express + JWT
- **Base de datos:** PostgreSQL + PostGIS
- **Datos geoespaciales:** API REST propia (`/api/geodata`)

## Requisitos

- Node.js 18+
- PostgreSQL con extensión PostGIS
- Base de datos `qgis` con las tablas geoespaciales del municipio

## Instalación y Ejecución

### Desarrollo Local

1. **Instalar dependencias del frontend:**
```bash
cd frontend
npm install
```

2. **Instalar dependencias del backend:**
```bash
cd backend
npm install
```

3. **Configurar variables de entorno:**
```bash
cp backend/.env.example backend/.env
# Editar backend/.env con las credenciales de la BD
```

4. **Iniciar el backend:**
```bash
cd backend
npm run dev
```
El backend corre en `http://localhost:3001`

5. **Iniciar el frontend:**
```bash
cd frontend
npm run dev
```
El frontend corre en `http://localhost:5173`

### Usuarios para Testing

| Usuario | Contraseña | Rol | Secretaría |
|---------|------------|-----|------------|
| admin | admin123 | admin | - |
| juanpablo | geovisor123 | editor_geo | - |
| planeacion | planeacion123 | secretaria | planeacion |
| salud | salud123 | secretaria | salud |
| educacion | educacion123 | secretaria | educacion |
| lector | lector123 | lector | planeacion |

## Estructura del Proyecto

```
alcaldia-geovisor/
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── pages/         # Páginas (Login, Mapa, Dashboard, PDM)
│   │   ├── organisms/     # Componentes complejos (MapViewer, LayerPanel)
│   │   ├── context/       # Contextos de React (Auth, Map)
│   │   ├── config/        # Configuraciones (capas, roles, secretarías)
│   │   └── services/      # Servicios API y estadísticas
│   └── package.json
├── backend/               # API REST Node.js
│   ├── src/
│   │   ├── routes/        # Rutas (auth, geodata, layers, stats, pdm)
│   │   ├── middleware/    # Middlewares (auth)
│   │   ├── db/            # Pool de conexión y esquemas SQL
│   │   └── server.js      # Entry point
│   └── package.json
├── nginx/                 # Configuración Nginx (producción)
└── docker-compose.yml     # Orquestación Docker
```

## Capas Disponibles

### Secretaría de Planeación
- Predios Urbanos
- Nomenclatura Vial
- Barrios Urbanos
- UBAs (1-5, C)
- Uso de Suelos (Estanco, Discotecas, Droguerías, Ferreterías, IPS, Restaurantes, Servicios)

### Zonas Verdes
- Zonas Verdes
- Gimnasios Bio Saludables

### Sisben
- Sisben Barrios
- Sisben UBA 2 y UBA 4

### Educación
- Predios Educativos

### Equipo Institucional
- Equipo Institucional
- Iglesias

### Infraestructura
- Transformadores de Alumbrado Público
- Luminarias (Tradicionales y LED)
- Apoyos de Alumbrado Público
- Rutas de Alumbrado Público
- Obras de Pavimentación

## Producción

```bash
# Construir frontend
cd frontend && npm run build

# Desplegar con Docker
docker-compose up -d
```

## Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/auth/me | Obtener perfil |
| GET | /api/geodata/:tabla | GeoJSON de una tabla PostGIS |
| GET | /api/layers | Listar capas disponibles |
| GET | /api/stats/general | Estadísticas generales |
| GET | /api/pdm | Metas del Plan de Desarrollo |

## Hoja de Ruta

- [x] Fase 1: Estructura del proyecto
- [x] Fase 2: Backend + Autenticación JWT
- [x] Fase 3: Frontend React + Login + Visor de mapas
- [x] Fase 4: Integración PostGIS directa + módulo PDM
- [ ] Fase 5: Dashboards + estadísticas con Chart.js
- [ ] Fase 6: Formularios de carga de datos

---

**Desarrollado para:** Alcaldía de Santander de Quilichao, Cauca, Colombia
**Responsable técnico:** Juan Pablo Holguín
