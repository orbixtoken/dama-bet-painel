// src/components/AdminShell.jsx
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useMemo } from 'react';

const s = {
  wrap: {
    minHeight: '100vh',
    background: '#0c0f14',
    color: '#eaecef',
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
  },
  aside: {
    borderRight: '1px solid #1f2533',
    background: '#0f141f',
    padding: 16,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  brand: { fontWeight: 700, fontSize: 18 },
  envBadge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 999,
    background: '#1a2233',
    border: '1px solid #2a3650',
    opacity: 0.9,
  },
  nav: { display: 'grid', gap: 8 },
  link: (active) => ({
    display: 'block',
    padding: '10px 12px',
    borderRadius: 8,
    background: active ? '#1a2233' : 'transparent',
    border: '1px solid ' + (active ? '#2a3650' : '#1f2533'),
    color: '#eaecef',
    textDecoration: 'none',
    fontSize: 14,
  }),
  sectionHdr: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 11,
    opacity: 0.65,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  main: { padding: 20 },
  mainInner: { maxWidth: 1200, margin: '0 auto' },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  btn: {
    background: '#1f2937',
    color: '#eaecef',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  role: { opacity: 0.7, fontSize: 12, marginTop: 2 },
  userBox: {
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    background: '#0e1422',
    border: '1px solid #1f2533',
    display: 'grid',
    gridTemplateColumns: '36px 1fr',
    gap: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#22304a,#1a2233)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: '#cbd5e1',
    border: '1px solid #2a3650',
  },
};

function useUser() {
  return useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  }, []);
}

function initialsOf(name = '') {
  const sName = String(name || '').trim();
  if (!sName) return 'AD';
  const parts = sName.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase?.() || '').join('') || 'AD';
}

export default function AdminShell() {
  const navigate = useNavigate();
  const user = useUser();

  const sair = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    navigate('/', { replace: true });
  };

  const env = (
    import.meta.env?.MODE ||
    import.meta.env?.VITE_APP_ENV ||
    import.meta.env?.NODE_ENV ||
    'dev'
  )
    .toString()
    .toUpperCase();

  const role = (user?.funcao_user_role || user?.funcao || user?.role || '-')
    .toString()
    .toUpperCase();
  const displayName = user?.nome || user?.usuario || 'Admin';
  const initials = initialsOf(displayName);

  return (
    <div style={s.wrap}>
      <aside style={s.aside}>
        <div style={s.brandRow}>
          <div style={s.brand}>Dama Bet • Admin</div>
          <div style={s.envBadge}>{env}</div>
        </div>

        <div className="user" style={s.userBox}>
          <div style={s.avatar}>{initials}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName}</div>
            <div style={s.role}>Função: {role}</div>
          </div>
        </div>

        <nav style={s.nav}>
          {/* Geral */}
          <div style={s.sectionHdr}>Geral</div>
          <NavLink to="/admin" end style={({ isActive }) => s.link(isActive)}>
            Visão geral
          </NavLink>
          <NavLink to="/dashboard" style={({ isActive }) => s.link(isActive)}>
            Voltar ao Dashboard
          </NavLink>

          {/* Clientes */}
          <div style={s.sectionHdr}>Clientes</div>
          <NavLink to="/admin/usuarios" style={({ isActive }) => s.link(isActive)}>
            Clientes (ativos)
          </NavLink>

          {/* Cassino */}
          <div style={s.sectionHdr}>Cassino</div>
          <NavLink
            to="/admin/cassino/games-config"
            style={({ isActive }) => s.link(isActive)}
          >
            Config. de Jogos
          </NavLink>

          {/* Financeiro */}
          <div style={s.sectionHdr}>Financeiro</div>
          <NavLink to="/admin/depositos" style={({ isActive }) => s.link(isActive)}>
            Depósitos
          </NavLink>
          <NavLink to="/admin/withdrawals" style={({ isActive }) => s.link(isActive)}>
            Saques
          </NavLink>
          {/* LINK CORRETO conforme AppRoutes: /admin/movimentos */}
          <NavLink to="/admin/movimentos" style={({ isActive }) => s.link(isActive)}>
            Movimentos (geral)
          </NavLink>
        </nav>
      </aside>

      <main style={s.main}>
        <div style={s.mainInner}>
          <div style={s.topbar}>
            <h1 style={{ margin: 0, fontSize: 20 }}>Console Administrativo</h1>
            <button style={s.btn} onClick={sair}>
              Sair
            </button>
          </div>

          {/* Rotas-filhas */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
