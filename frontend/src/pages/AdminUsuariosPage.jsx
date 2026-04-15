import { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { usuariosService } from '../services/api';
import SECRETARIAS from '../config/secretarias';
import './AdminUsuariosPage.css';

const ROLES = ['admin', 'editor_geo', 'secretaria', 'lector'];

const EMPTY_FORM = {
  username: '', password: '', nombre_completo: '',
  email: '', rol: 'lector', secretaria_id: '',
};

// ── Formulario modal ─────────────────────────────────────────────────────────
function UsuarioModal({ modo, usuario, onClose, onSaved }) {
  const isEdit = modo === 'editar';
  const [form, setForm] = useState(
    isEdit
      ? {
          nombre_completo: usuario.nombre_completo || '',
          email:           usuario.email || '',
          rol:             usuario.rol,
          secretaria_id:   usuario.secretaria_id || '',
          password:        '',
        }
      : { ...EMPTY_FORM }
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.secretaria_id) payload.secretaria_id = null;
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) {
        await usuariosService.update(usuario.id, payload);
      } else {
        await usuariosService.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">
            {isEdit ? `Editar: ${usuario.username}` : 'Nuevo Usuario'}
          </h2>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body">
            {error && <div className="admin-error">{error}</div>}

            {!isEdit && (
              <div className="admin-field">
                <label className="admin-label">Username *</label>
                <input className="admin-input" value={form.username}
                  onChange={set('username')} required autoFocus />
              </div>
            )}

            <div className="admin-field">
              <label className="admin-label">Nombre completo</label>
              <input className="admin-input" value={form.nombre_completo}
                onChange={set('nombre_completo')} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Email</label>
              <input className="admin-input" type="email" value={form.email}
                onChange={set('email')} />
            </div>

            <div className="admin-field">
              <label className="admin-label">Rol *</label>
              <select className="admin-select" value={form.rol} onChange={set('rol')} required>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label">Secretaría</label>
              <select className="admin-select" value={form.secretaria_id} onChange={set('secretaria_id')}>
                <option value="">— Sin secretaría —</option>
                {SECRETARIAS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label">
                {isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
              </label>
              <input className="admin-input" type="password" value={form.password}
                onChange={set('password')} required={!isEdit} minLength={6} />
              {isEdit && <span className="admin-hint">Mín. 6 caracteres si deseas cambiarla</span>}
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="admin-btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn--primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function AdminUsuariosPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { modo: 'crear'|'editar', usuario? }
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await usuariosService.getAll();
      setUsuarios(data);
    } catch {
      setActionError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    load();
  }, [user, navigate, load]);

  async function handleToggle(u) {
    setActionError('');
    try {
      const updated = await usuariosService.toggle(u.id);
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: updated.activo } : x));
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error al cambiar estado');
    }
  }

  async function handleDelete(u) {
    if (!confirm(`¿Eliminar permanentemente al usuario "${u.username}"?`)) return;
    setActionError('');
    try {
      await usuariosService.remove(u.id);
      setUsuarios(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error al eliminar');
    }
  }

  function handleSaved() {
    setModal(null);
    load();
  }

  function formatFecha(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="admin-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="admin-logo" />
          <div>
            <div className="admin-entity">Alcaldía Municipal</div>
            <div className="admin-city">Santander de Quilichao</div>
          </div>
        </div>
        <div className="admin-header-right">
          {user && (
            <span className="admin-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              {user.username} · {user.role}
            </span>
          )}
          <Link to="/dashboard" className="admin-back-btn">← Dashboard</Link>
        </div>
      </header>

      {/* Band */}
      <div className="admin-band">
        <span className="admin-band-label">Administración</span>
        <span className="admin-band-label">›</span>
        <span className="admin-band-title">Gestión de Usuarios</span>
      </div>

      {/* Scroll container */}
      <div className="admin-scroll">
      {/* Main */}
      <main className="admin-main">
        <div className="admin-toolbar">
          <div>
            <h1 className="admin-title">Usuarios del sistema</h1>
            <p className="admin-count">{usuarios.length} usuarios registrados</p>
          </div>
          <button className="admin-btn--primary" onClick={() => setModal({ modo: 'crear' })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nuevo usuario
          </button>
        </div>

        {actionError && <div className="admin-error" style={{ marginBottom: 16 }}>{actionError}</div>}

        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-empty">Cargando...</div>
          ) : usuarios.length === 0 ? (
            <div className="admin-empty">No hay usuarios registrados</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Secretaría</th>
                  <th>Creado</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className={!u.activo ? 'td-inactive' : ''}>
                    <td className="td-username">{u.username}</td>
                    <td>{u.nombre_completo || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      <span className={`role-badge role-badge--${u.rol}`}>{u.rol}</span>
                    </td>
                    <td>{u.secretaria_nombre || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{formatFecha(u.created_at)}</td>
                    <td>
                      <span className={`status-badge status-badge--${u.activo ? 'active' : 'inactive'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-action-btn"
                          onClick={() => setModal({ modo: 'editar', usuario: u })}
                        >
                          Editar
                        </button>
                        <button
                          className={`admin-action-btn admin-action-btn--toggle-${u.activo ? 'off' : 'on'}`}
                          onClick={() => handleToggle(u)}
                          disabled={u.id === user?.id}
                          title={u.id === user?.id ? 'No puedes desactivar tu propio usuario' : ''}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          className="admin-action-btn admin-action-btn--danger"
                          onClick={() => handleDelete(u)}
                          disabled={u.id === user?.id}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      </div>{/* /admin-scroll */}

      {/* Modal */}
      {modal && (
        <UsuarioModal
          modo={modal.modo}
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
