# GeoVisor Municipal - Alcaldía de Santander de Quilichao

Sistema de información geográfica para las 14 secretarías del municipio de Santander de Quilichao, Cauca, Colombia.

## Arquitectura

- **Frontend:** React + OpenLayers + Vite
- **Backend:** Node.js + Express + JWT
- **Mapas:** GeoServer (Tomcat)
- **Base de datos:** PostgreSQL + PostGIS

## Requisitos

- Node.js 18+
- GeoServer corriendo en `http://localhost:8080/geoserver`
- PostgreSQL (opcional, para futura implementación)

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

3. **Iniciar el backend:**
```bash
cd backend
npm run dev
```
El backend corre en `http://localhost:3001`

4. **Iniciar el frontend:**
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
│   │   ├── pages/         # Páginas (Login, Mapa, Dashboard)
│   │   ├── components/    # Componentes reutilizables
│   │   ├── context/       # Contextos de React (Auth, Map)
│   │   ├── organisms/     # Componentes complejos (MapViewer)
│   │   ├── config/        # Configuraciones
│   │   └── services/      # Servicios API
│   └── package.json
├── backend/               # API REST Node.js
│   ├── src/
│   │   ├── routes/        # Rutas de la API
│   │   ├── middleware/    # Middlewares (auth, roles)
│   │   └── server.js      # Entry point
│   └── package.json
├── nginx/                 # Configuración Nginx (producción)
└── docker-compose.yml     # Orquestación Docker
```

## Capas de GeoServer Disponibles

### Secretaría de Planeación
- Predios Urbanos (`pg_predios_urbanos_m`)
- Nomenclatura Vial
- Barrios Urbanos
- UBAs (1-5, C)
- Uso de Suelos (Estanco, Discotecas, Droguerías, etc.)

### Zonas Verdes
- Zonas Verdes
- Gimnasios Bio Saludables

### Sisben
- Sisben Barrios
- Sisben UBA 2
- Sisben UBA 4

### Educación
- Predios Educativos

### Equipo Institucional
- Equipo Institucional
- Iglesias

## Producción

Para desplegar en producción (IP: `192.168.1.10`):

1. Construir frontend:
```bash
cd frontend
npm run build
```

2. Usar Docker Compose:
```bash
docker-compose up -d
```

## Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/auth/me | Obtener perfil |
| POST | /api/auth/logout | Cerrar sesión |
| GET | /api/layers | Obtener capas |
| GET | /api/stats/general | Estadísticas generales |

## Hoja de Ruta

- [x] Fase 1: Estructura del proyecto
- [x] Fase 2: Backend + Autenticación JWT
- [x] Fase 3: Frontend React + Login + Visor de mapas
- [ ] Fase 4: Dashboards + estadísticas con Chart.js
- [ ] Fase 5: Formularios de carga de datos
- [ ] Fase 6: Apache Superset + mejoras

---

**Desarrollado para:** Alcaldía de Santander de Quilichao, Cauca, Colombia
**Responsable técnico:** Juan Pablo Holguín
