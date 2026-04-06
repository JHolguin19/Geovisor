// Roles y permisos del sistema
export const ROLES = {
  admin: {
    name: 'Administrador',
    description: 'Alcalde / TI',
    permissions: ['read', 'write', 'delete', 'manage_users', 'view_all', 'manage_layers']
  },
  secretaria: {
    name: 'Secretaría',
    description: 'Jefe de secretaría',
    permissions: ['read', 'write', 'view_own']
  },
  lector: {
    name: 'Lector',
    description: 'Personal de apoyo',
    permissions: ['read', 'view_own']
  },
  editor_geo: {
    name: 'Editor Geo',
    description: 'Gestión de GeoServer',
    permissions: ['read', 'write', 'delete', 'manage_layers', 'view_all']
  }
};

// Verificar si un rol tiene un permiso específico
export function hasPermission(role, permission) {
  if (!ROLES[role]) return false;
  return ROLES[role].permissions.includes(permission);
}

// Verificar si un rol puede ver capas de una secretaría
export function canViewSecretaria(role, secretaria, userSecretaria) {
  // Admin y editor_geo ven todo
  if (role === 'admin' || role === 'editor_geo') return true;

  // Lector y secretaria solo ven su propia secretaría
  if (role === 'lector' || role === 'secretaria') {
    return userSecretaria === secretaria;
  }

  return false;
}

// Verificar si un rol puede editar datos de una secretaría
export function canEditSecretaria(role, secretaria, userSecretaria) {
  // Admin puede editar todo
  if (role === 'admin') return true;

  // Secretaria solo puede editar su propia secretaría
  if (role === 'secretaria') {
    return userSecretaria === secretaria;
  }

  // Editor_geo puede editar todas las capas
  if (role === 'editor_geo') return true;

  return false;
}

export default ROLES;