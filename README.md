# GeoVisor Municipal - Alcaldía de Santander de Quilichao

## Documentación Técnica del Proyecto

**Fecha de última actualización:** 2026-04-06
**Estado:** En desarrollo

---

## 1. Visión General

GeoVisor Municipal es un sistema de información geográfica (SIG) web diseñado para la Alcaldía de Santander de Quilichao. Permite visualizar, consultar y gestionar información geoespacial organizada por secretarías municipales. Los datos geoespaciales se sirven directamente desde **PostGIS** a través de una API REST propia.

### 1.1 Propósito

- Centralizar la información geoespacial del municipio
- Facilitar el acceso a datos territoriales por secretaría
- Proveer herramientas de consulta y análisis espacial
- Implementar control de acceso basado en roles

---

## 2. Arquitectura del Sistema

### 2.1 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + Vite |
| **Mapas** | OpenLayers 9 |
| **Enrutamiento** | React Router DOM 6 |
| **HTTP Cliente** | Axios |
| **Lenguaje** | JavaScript (ES6+) |
| **Backend** | Node.js + Express |
| **Base de datos** | PostgreSQL + PostGIS |
| **Autenticación** | JWT |

### 2.2 Arquitectura de Componentes

El frontend sigue la **arquitectura atómica**:

```
src/
├── atoms/          # Componentes básicos (botones, inputs, labels)
├── molecules/      # Combinaciones de átomos (form inputs, cards)
├── organisms/      # Componentes complejos (MapViewer, Sidebar)
├── templates/      # Layouts de página
├── pages/          # Páginas completas (LoginPage, MapPage)
├── context/        # Contextos de React (Auth, Map)
├── config/         # Configuraciones (capas, roles, secretarías)
├── services/       # Servicios API
└── utils/          # Utilidades y helpers
```

### 2.3 Diagrama de Flujo

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuario   │────▶│  Frontend    │────▶│   Backend    │
│             │     │  React+OL    │     │  Node+JWT    │
└─────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │   PostGIS    │
                                         │  PostgreSQL  │
                                         └──────────────┘
```

---

## 3. Estructura del Proyecto

```
alcaldia-geovisor/
└── frontend/
    ├── index.html              # HTML base
    ├── package.json            # Dependencias
    ├── vite.config.js          # Configuración Vite + Proxy
    └── src/
        ├── main.jsx            # Punto de entrada
        ├── App.jsx             # Componente raíz con routing
        ├── App.css             # Estilos globales y variables CSS
        ├── config/
        │   ├── mapConfig.js    # Centro, zoom y proyecciones del mapa
        │   ├── layers.js       # Configuración de capas (PostGIS)
        │   ├── roles.js        # Definición de roles y permisos
        │   └── secretarias.js  # Listado de secretarías
        ├── context/
        │   ├── AuthContext.jsx # Autenticación y autorización
        │   └── MapContext.jsx  # Estado del mapa OpenLayers
        ├── services/
        │   ├── api.js          # Cliente axios + servicios
        │   └── statsService.js # Estadísticas desde PostGIS
        ├── organisms/
        │   └── MapViewer/
        │       ├── MapViewer.jsx
        │       ├── MapViewer.css
        │       └── index.js
        ├── templates/
        ├── pages/
        ├── molecules/
        └── atoms/
```

---

## 4. Configuración y Dependencias

### 4.1 package.json

```json
{
  "name": "alcaldia-geovisor-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "ol": "^9.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  }
}
```

### 4.2 vite.config.js - Proxy

```javascript
{
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}
```

---

## 5. Sistema de Autenticación y Roles

### 5.1 Roles del Sistema

| Rol | Descripción | Permisos |
|-----|-----------|----------|
| **admin** | Alcalde / TI | read, write, delete, manage_users, view_all, manage_layers |
| **secretaria** | Jefe de secretaría | read, write, view_own |
| **lector** | Personal de apoyo | read, view_own |
| **editor_geo** | Gestión de capas geoespaciales | read, write, delete, manage_layers, view_all |

### 5.2 Flujo de Autenticación

1. Usuario ingresa credenciales en LoginPage
2. Se envía POST a `/api/auth/login`
3. Backend valida y retorna JWT
4. Token se guarda en localStorage
5. AuthContext verifica token en cada carga
6. Interceptor de axios agrega `Authorization: Bearer <token>`

### 5.3 AuthContext.jsx

Proporciona:
- `user`: Usuario autenticado
- `token`: JWT token
- `isAuthenticated`: Boolean
- `login(username, password)`: Inicia sesión
- `logout()`: Cierra sesión
- `hasRole(role)`: Verifica rol
- `hasPermission(permission)`: Verifica permiso

---

## 6. Capas PostGIS

### 6.1 Configuración del Mapa

```javascript
MAP_CONFIG = {
  defaultCenter: [-76.483765, 3.012569], // Santander de Quilichao
  defaultZoom: 14,
  projections: {
    map: 'EPSG:3857',   // Web Mercator
    data: 'EPSG:4326'   // WGS84
  }
}
```

### 6.2 Capas por Secretaría

#### Secretaría de Planeación
| ID | Nombre | Tabla PostGIS |
|----|--------|---------------|
| predios_urbanos | Predios Urbanos | predios_2025_m |
| nomenclatura_vial | Nomenclatura Vial | SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025 |
| barrios_urbanos | Barrios Urbanos | barriosurbanos |
| uba1-uba5, ubac | UBAs 1-5, C | BARR_UBA_1, BARR_UBA2, etc. |
| uso_estanco | Estanco | uds_barestanco |
| uso_discotecas | Discotecas | uso_de_suelos_discotecas |
| uso_droguerias | Droguerías | uds2_droguerias |
| uso_ferreterias | Ferreterías | uds_ferreterias |
| uso_ips | IPS | uds_ips |
| uso_restaurantes | Restaurantes | uds_restaurantes |
| uso_servicios | Servicios | uds_otros |

#### Zonas Verdes
| ID | Nombre | Tabla PostGIS |
|----|--------|---------------|
| zonas_verdes | Zonas Verdes | zonasverdes |
| gimnasios_biosaludables | Gimnasios Bio | Gimnasiosbiosaludables |

#### Sisben
| ID | Nombre | Tabla PostGIS |
|----|--------|---------------|
| sisben_barrios | Sisben Barrios | sisben_barrios |
| sisben_uba2 | Sisben UBA 2 | uba2_datospoblaciones |
| sisben_uba4 | Sisben UBA 4 | sisben_uba4 |

#### Educación
| ID | Nombre | Tabla PostGIS |
|----|--------|---------------|
| predios_educativos | Predios Educativos | predios_educativos |

#### Equipo Institucional
| ID | Nombre | Tabla PostGIS |
|----|--------|---------------|
| equipo_institucional | Equipo Institucional | predios_equipo_institucional |
| iglesias | Iglesias | predios_iglesias |

### 6.3 Grupos de Capas

- **UBAs**: Unidades Barriales de Atención (exclusive: false)
- **Uso de Suelo**: Establecimientos por tipo (exclusive: false)

### 6.4 Funciones de Utilidad (layers.js)

```javascript
getAllLayers()              // Lista plana de todas las capas
getLayerById(id)            // Obtener capa por ID
getLayersBySecretaria(id)   // Capas por secretaría
getLayersByGroup(name)      // Capas por grupo
getGeoJsonApiUrl(layer)     // URL del endpoint /api/geodata para la capa
```

---

## 7. Sistema de Mapas (OpenLayers)

### 7.1 MapContext.jsx

Proporciona:
- `map`: Instancia de OpenLayers Map
- `mapReady`: Boolean
- `activeLayers`: Set de capas activas
- `selectedFeature`: Feature seleccionado
- `initMap(target)`: Inicializa mapa
- `addLayer(layer)`: Agrega capa
- `removeLayer(layer)`: Remueve capa
- `getLayerByName(name)`: Busca capa por nombre
- `toggleLayerVisibility(name)`: Alterna visibilidad
- `zoomToExtent(extent)`: Zoom a extensión

### 7.2 MapViewer.jsx

Componente principal que:
- Crea el mapa OpenLayers
- Carga capas vectoriales (GeoJSON) desde `/api/geodata`
- Implementa consulta de atributos al hacer clic
- Sincroniza con MapContext

### 7.3 Coordenadas

- **Centro:** [-76.483765, 3.012569] (Santander de Quilichao)
- **Proyección del mapa:** EPSG:3857 (Web Mercator)
- **Proyección de datos:** EPSG:4326 (WGS84)

---

## 8. API del Backend

### 8.1 Configuración Axios

- Base URL: `/api`
- Timeout: 30000ms
- Interceptor request: Agrega token JWT
- Interceptor response: Maneja 401 (logout)

### 8.2 Endpoints Disponibles

#### Autenticación
```
POST /api/auth/login          Iniciar sesión
POST /api/auth/logout         Cerrar sesión
GET  /api/auth/me             Obtener perfil
POST /api/auth/refresh        Refresh token
```

#### Datos Geoespaciales
```
GET /api/geodata/:tableName               Obtener GeoJSON de una tabla
GET /api/geodata/:tableName?bbox=...      Filtrar por bbox
GET /api/geodata/:tableName?q=...&searchFields=...  Búsqueda por texto
GET /api/geodata/:tableName?cols=...      Seleccionar columnas
```

#### Capas
```
GET /api/layers                           Listar capas
GET /api/layers/:id                       Detalle de capa
GET /api/layers/secretaria/:id            Capas por secretaría
```

#### Estadísticas
```
GET /api/stats/uba/:id                    Stats por UBA
GET /api/stats/uso-suelo                  Conteo uso de suelo
GET /api/stats/general                    Stats generales
```

#### PDM
```
GET /api/pdm                              Metas PDM (con filtros)
GET /api/pdm/overview                     Resumen ejecutivo
GET /api/pdm/resumen                      Resumen por parámetros
GET /api/pdm/secretarias                  Secretarías con metas
GET /api/pdm/pilares                      Pilares del PDM
GET /api/pdm/:id                          Meta individual
```

#### Formularios
```
POST /api/forms/submit                    Enviar formulario
GET  /api/forms/history/:secretariaId     Historial
```

---

## 9. Secretarías del Municipio

```javascript
[
  { id: 'planeacion', name: 'Secretaría de Planeación', code: 'PLA' },
  { id: 'salud', name: 'Secretaría de Salud', code: 'SAL' },
  { id: 'educacion', name: 'Secretaría de Educación', code: 'EDU' },
  { id: 'hacienda', name: 'Secretaría de Hacienda', code: 'HAC' },
  { id: 'obras', name: 'Secretaría de Obras', code: 'OBR' },
  { id: 'ambiente', name: 'Secretaría de Ambiente', code: 'AMB' },
  { id: 'desarrollo_social', name: 'Secretaría de Desarrollo Social', code: 'DES' },
  { id: 'gobierno', name: 'Secretaría de Gobierno', code: 'GOB' },
  { id: 'cultura', name: 'Secretaría de Cultura', code: 'CUL' },
  { id: 'deportes', name: 'Secretaría de Deportes', code: 'DEP' },
  { id: 'transito', name: 'Secretaría de Tránsito', code: 'TRA' },
  { id: 'seguridad', name: 'Secretaría de Seguridad', code: 'SEG' },
  { id: 'juridica', name: 'Secretaría Jurídica', code: 'JUR' },
  { id: 'talento_humano', name: 'Talento Humano', code: 'TH' }
]
```

---

## 10. Enrutamiento (App.jsx)

```
/ → Redirect to /mapa
/login → LoginPage (pública)
/mapa → MapPage (protegida)
/dashboard → DashboardPage (protegida)
* → Redirect to /mapa
```

### PrivateRoute Component

Protege rutas verificando:
1. `isAuthenticated`: Si no está autenticado → /login
2. `requiredRole`: Si el rol no tiene permiso → /mapa

---

## 11. Estilos Globales (App.css)

### Variables CSS

```css
:root {
  --color-primary: #003366;
  --color-secondary: #0066cc;
  --color-accent: #0055aa;
  --color-background: #ffffff;
  --color-surface: #f5f5f5;
  --header-height: 70px;
  --sidebar-width: 240px;
  /* ... más variables */
}
```

---

## 12. Datos Estáticos (UBA)

```javascript
UBA_DATA = {
  uba1: { uba: 'UBA1', numero_predios: 2197, area_m2: 718315 },
  uba2: { uba: 'UBA2', numero_predios: 5959, area_m2: 1662210 },
  uba3: { uba: 'UBA3', numero_predios: 2805, area_m2: 1054055 },
  uba4: { uba: 'UBA4', numero_predios: 3258, area_m2: 902978 },
  uba5: { uba: 'UBA5', numero_predios: 1537, area_m2: 608186 },
  ubac: { uba: 'UBAC', numero_predios: 2028, area_m2: 1491423 }
}
```

---

## 13. Comandos de Desarrollo

```bash
# Frontend
cd alcaldia-geovisor/frontend
npm install
npm run dev        # Puerto 5173
npm run build

# Backend
cd alcaldia-geovisor/backend
npm install
npm run dev        # Puerto 3001

# Docker (producción)
docker-compose up -d
```

---

## 14. Variables de Entorno (backend/.env)

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

DB_HOST=localhost
DB_PORT=5432
DB_NAME=qgis
DB_USER=postgres
DB_PASSWORD=your-password
```

---

## 15. Consideraciones de Seguridad

1. **JWT**: Token almacenado en localStorage
2. **Interceptor 401**: Logout automático si token expira
3. **PrivateRoute**: Protección de rutas por rol
4. **hasPermission**: Verificación granular de permisos
5. **Lista blanca de tablas**: El endpoint `/api/geodata` solo permite tablas registradas en `geo_tablas`
6. **Proxy Nginx**: La API queda detrás de Nginx en producción

---

## 16. Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-03-20 | 0.1.0 | Inicio del proyecto, arquitectura definida |
| 2026-03-25 | 0.2.0 | Contextos Auth y Map, capas configuradas |
| 2026-04-05 | 0.3.0 | Migración a PostGIS directo, módulo PDM |
| 2026-04-06 | 0.4.0 | Eliminación de GeoServer, búsqueda de texto en geodata |

---

**Desarrollado para:** Alcaldía de Santander de Quilichao, Cauca, Colombia
**Responsable técnico:** Juan Pablo Holguín
