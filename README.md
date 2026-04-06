# GeoVisor Municipal - Alcaldía de Santander de Quilichao

## Documentación Técnica del Proyecto

**Fecha de última actualización:** 2026-03-25
**Estado:** En desarrollo

---

## 1. Visión General

GeoVisor Municipal es un sistema de información geográfica (SIG) web diseñado para la Alcaldía de Santander de Quilichao. Permite visualizar, consultar y gestionar información geoespacial organizada por secretarías municipales.

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
| **GeoServer** | localhost:8080 (WMS/WFS) |

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
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Usuario   │────▶│  Frontend    │────▶│  GeoServer  │
│             │     │  React+OL    │     │  (WMS/WFS)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Backend    │
                    │  Node+JWT    │
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
        │   ├── geoserver.js    # Configuración de GeoServer
        │   ├── layers.js       # Configuración de capas WMS/WFS
        │   ├── roles.js        # Definición de roles y permisos
        │   └── secretarias.js  # Listado de secretarías
        ├── context/
        │   ├── AuthContext.jsx # Autenticación y autorización
        │   └── MapContext.jsx  # Estado del mapa OpenLayers
        ├── services/
        │   └── api.js          # Cliente axios + servicios
        ├── organisms/
        │   └── MapViewer/
        │       ├── MapViewer.jsx
        │       ├── MapViewer.css
        │       └── index.js
        ├── templates/          # (Pendiente)
        ├── pages/              # (Pendiente)
        ├── molecules/          # (Pendiente)
        └── atoms/              # (Pendiente)
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
      '/geoserver': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
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
| **editor_geo** | Gestión GeoServer | read, write, delete, manage_layers, view_all |

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

## 6. Capas de GeoServer

### 6.1 Configuración

```javascript
GEOSERVER_CONFIG = {
  baseUrl: '/geoserver',
  directUrl: 'http://localhost:8080/geoserver',
  workspace: 'AlcaldiaGeovisor',
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
| ID | Nombre | Capa GeoServer | Tipo |
|----|--------|----------------|------|
| predios_urbanos | Predios Urbanos | pg_predios_urbanos_m | WMS |
| nomenclatura_vial | Nomenclatura Vial | SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025 | WMS |
| barrios_urbanos | Barrios Urbanos | pg_barriosurbanos | WMS |
| uba1-uba5, ubac | UBAs 1-5, C | pg_uba1, pg_uba2, etc. | WMS |
| uso_estanco | Estanco | pg_uds_bar_estanco | WMS |
| uso_discotecas | Discotecas | pg_uds_discos | WMS |
| uso_droguerias | Droguerías | pg_uds_droguerias | WMS |
| uso_ferreterias | Ferreterías | pg_uds_ferreterias | WMS |
| uso_ips | IPS | pg_uds_ips | WMS |
| uso_restaurantes | Restaurantes | pg_uds_restaurantes | WMS |
| uso_servicios | Servicios | pg_uds_otros | WMS |

#### Zonas Verdes
| ID | Nombre | Capa GeoServer | Tipo |
|----|--------|----------------|------|
| zonas_verdes | Zonas Verdes | pg_zonasverdes | WMS |
| gimnasios_biosaludables | Gimnasios Bio | pg_Gimnasiosbiosaludables | WFS |

#### Sisben
| ID | Nombre | Capa GeoServer |
|----|--------|----------------|
| sisben_barrios | Sisben Barrios | pg_sisben_barrios |
| sisben_uba2 | Sisben UBA 2 | pg_uba2_datospoblaciones |
| sisben_uba4 | Sisben UBA 4 | sisben_uba4 |

#### Educación
| ID | Nombre | Capa GeoServer |
|----|--------|----------------|
| predios_educativos | Predios Educativos | pg_predios_educativos |

#### Equipo Institucional
| ID | Nombre | Capa GeoServer |
|----|--------|----------------|
| equipo_institucional | Equipo Institucional | pg_predios_equipo_institucional |
| iglesias | Iglesias | pg_predios_iglesias |

### 6.3 Grupos de Capas

- **UBAs**: Unidades Barriales de Atención (exclusive: false)
- **Uso de Suelo**: Establecimientos por tipo (exclusive: false)

### 6.4 Funciones de Utilidad (layers.js)

```javascript
getAllLayers()           // Lista plana de todas las capas
getLayerById(id)         // Obtener capa por ID
getLayersBySecretaria(id) // Capas por secretaría
getLayersByGroup(name)   // Capas por grupo
getWmsUrl(layer)         // URL WMS endpoint
getWfsUrl(layer, format) // URL WFS endpoint
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
- `getFeatureInfoAt(coord, layers)`: GetFeatureInfo

### 7.2 MapViewer.jsx

Componente principal que:
- Crea el mapa OpenLayers
- Maneja capas WMS y WFS dinámicamente
- Implementa GetFeatureInfo en click
- Sincroniza con MapContext

### 7.3 Coordenadas

- **Centro:** [-76.483765, 3.012569] (Santander de Quilichao)
- **Proyección del mapa:** EPSG:3857 (Web Mercator)
- **Proyección de datos:** EPSG:4326 (WGS84)

---

## 8. Servicios API (api.js)

### 8.1 Configuración Axios

- Base URL: `/api`
- Timeout: 30000ms
- Interceptor request: Agrega token JWT
- Interceptor response: Maneja 401 (logout)

### 8.2 Servicios Disponibles

#### authService
```javascript
login(username, password)
logout()
getProfile()
refreshToken()
```

#### layersService
```javascript
getAll()
getBySecretaria(secretariaId)
getLayerInfo(layerId)
```

#### statsService
```javascript
getStatsByUba(ubaId)
getUsoSueloCount()
getGeneralStats()
```

#### formsService
```javascript
submit(formData)
getHistory(secretariaId)
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

### Utilidades

- `.hidden`, `.flex`, `.flex-column`, `.flex-center`
- `.gap-sm`, `.gap-md`
- Scrollbar personalizado

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

## 13. Componentes Pendientes

### Por Implementar

| Componente | Ruta | Estado |
|------------|------|--------|
| LoginPage | pages/LoginPage.jsx | Pendiente |
| MapPage | pages/MapPage.jsx | Pendiente |
| DashboardPage | pages/DashboardPage.jsx | Pendiente |
| MainLayout | templates/MainLayout.jsx | Pendiente |
| Sidebar | organisms/Sidebar/Sidebar.jsx | Pendiente |
| LayerPanel | organisms/LayerPanel/LayerPanel.jsx | Pendiente |
| FeaturePopup | molecules/FeaturePopup/FeaturePopup.jsx | Pendiente |
| Header | organisms/Header/Header.jsx | Pendiente |

---

## 14. Comandos de Desarrollo

```bash
# Navegar al frontend
cd alcaldia-geovisor/frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (puerto 5173)
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview
```

---

## 15. Endpoints del Backend (Pendientes)

El backend debe implementar:

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener perfil
- `POST /api/auth/refresh` - Refresh token

### Capas
- `GET /api/layers` - Listar capas
- `GET /api/layers/:id` - Detalle de capa
- `GET /api/layers/secretaria/:id` - Capas por secretaría

### Estadísticas
- `GET /api/stats/uba/:id` - Stats por UBA
- `GET /api/stats/uso-suelo` - Conteo uso de suelo
- `GET /api/stats/general` - Stats generales

### Formularios
- `POST /api/forms/submit` - Enviar formulario
- `GET /api/forms/history/:secretariaId` - Historial

---

## 16. Consideraciones de Seguridad

1. **JWT**: Token almacenado en localStorage
2. **Interceptor 401**: Logout automático si token expira
3. **PrivateRoute**: Protección de rutas por rol
4. **hasPermission**: Verificación granular de permisos
5. **Proxy**: GeoServer y API detrás de proxy para evitar CORS

---

## 17. Migración desde Aplicativo Anterior

El proyecto anterior (`aplicativo/appWeb/`) usaba:
- HTML/CSS/JS puro
- Leaflet para mapas
- ~25 capas WMS

La migración a React + OpenLayers permite:
- Mejor gestión de estado
- Componentes reutilizables
- Tipado estático opcional
- Mejor rendimiento con Virtual DOM
- OpenLayers: Más control sobre capas y proyecciones

---

## 18. Recursos Adicionales

### Documentación Oficial
- [React](https://react.dev/)
- [OpenLayers](https://openlayers.org/docs/)
- [Vite](https://vitejs.dev/)
- [GeoServer WMS](https://docs.geoserver.org/stable/en/user/services/wms/index.html)
- [GeoServer WFS](https://docs.geoserver.org/stable/en/user/services/wfs/index.html)

### Capas de GeoServer (Workspace: AlcaldiaGeovisor)
- pg_predios_urbanos_m
- pg_barriosurbanos
- pg_uba1 a pg_uba5, pg_ubac
- pg_uds_* (uso de suelo)
- pg_sisben_* (Sisben)
- pg_zonasverdes
- pg_Gimnasiosbiosaludables

---

## 19. Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-03-20 | 0.1.0 | Inicio del proyecto, arquitectura definida |
| 2026-03-25 | 0.2.0 | Contextos Auth y Map implementados, capas configuradas |

---

*Documentación generada para contexto de IA - GeoVisor Municipal*
