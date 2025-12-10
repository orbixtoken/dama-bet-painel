// src/components/Topbar.jsx
import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Topbar.css';

// Opcional via .env
const BRAND_LOGO = import.meta.env.VITE_APP_LOGO_URL || null;      // ex.: /logo-damabet.png
const APP_NAME   = import.meta.env.VITE_APP_NAME || 'Dama Bet';

function initialsOf(name = '') {
  const s = String(name || '').trim();
  if (!s) return 'AD';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase?.() || '').join('') || 'AD';
}

export default function Topbar() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  }, []);

  const displayName =
    user?.nome || user?.username || user?.usuario || 'Admin';

  const role = String(
    user?.funcao_user_role || user?.funcao || user?.role || 'ADMIN'
  ).toUpperCase();

  const env = String(
    import.meta.env?.MODE ||
    import.meta.env?.VITE_APP_ENV ||
    import.meta.env?.NODE_ENV ||
    'dev'
  ).toUpperCase();

  const sair = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    navigate('/', { replace: true });
  };

  const isAdmin = role === 'ADMIN' || role === 'MASTER';
  const initials = initialsOf(displayName);

  return (
    <header className="topbar">
      {/* lado esquerdo: logo + app name + link para dashboard */}
      <div className="topbar-left">
        <Link to="/dashboard" className="brand">
          {BRAND_LOGO ? (
            <img
              src={BRAND_LOGO}
              alt={`${APP_NAME} logo`}
              width={28}
              height={28}
              style={{ display: 'block', borderRadius: 6 }}
            />
          ) : (
            <div className="brand-fallback" aria-hidden="true">{APP_NAME[0]}</div>
          )}
          <span className="brand-name">{APP_NAME}</span>
        </Link>

        {isAdmin && (
          <Link to="/admin" className="admin-link" title="Ir para Admin">
            Admin
          </Link>
        )}
      </div>

      {/* lado direito: env + usuário + sair */}
      <div className="topbar-right">
        <span className="env-badge" title="Ambiente">{env}</span>

        <div className="userchip" title={displayName}>
          <div className="avatar">{initials}</div>
          <div className="user-meta">
            <div className="user-name">{displayName}</div>
            <div className="user-role">{role}</div>
          </div>
        </div>

        <button className="btn-logout" onClick={sair}>Sair</button>
      </div>
    </header>
  );
}
//oi