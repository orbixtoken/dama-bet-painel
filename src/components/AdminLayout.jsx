// src/components/AdminLayout.jsx
import { NavLink, Outlet } from 'react-router-dom';

const baseLink = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 8,
  color: '#cbd5e1',
  textDecoration: 'none',
};
const linkActive = ({ isActive }) => ({
  ...baseLink,
  background: isActive ? '#1e293b' : 'transparent',
  color: isActive ? '#ffffff' : '#cbd5e1',
  border: isActive ? '1px solid #334155' : '1px solid transparent',
});

export default function AdminLayout() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        minHeight: '100vh',
        background: '#0b1220',
        color: '#e5e7eb',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid #1f2937',
          padding: 16,
          background: '#0b1324',
        }}
      >
        <div style={{ margin: '6px 0 16px', fontWeight: 600 }}>Tiger 67 • Admin</div>

        {/* GERAL */}
        <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>Geral</div>
        <nav style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          <NavLink to="/admin" style={linkActive} end>
            Visão geral
          </NavLink>
          <NavLink to="/dashboard" style={linkActive}>
            Voltar ao Dashboard
          </NavLink>
        </nav>

        {/* CLIENTES */}
        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>Clientes</div>
        <nav style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {/* Lista de usuários / clientes ativos */}
          <NavLink to="/admin/usuarios" style={linkActive}>
            Clientes (ativos)
          </NavLink>
        </nav>

        {/* CASSINO */}
        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>Cassino</div>
        <nav style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          <NavLink to="/admin/casino/games" style={linkActive}>
            Config. de Jogos
          </NavLink>
        </nav>

        {/* FINANCEIRO */}
        <div style={{ marginTop: 14, opacity: 0.65, fontSize: 12 }}>Financeiro</div>
        <nav style={{ display: 'grid', gap: 6, marginTop: 6 }}>
          {/* Página de saques para aprovação/gestão */}
          <NavLink to="/admin/saques" style={linkActive}>
            Saques
          </NavLink>
          {/* Se futuramente tiver depósitos administrativos, é só descomentar/adicionar:
          <NavLink to="/admin/depositos" style={linkActive}>Depósitos</NavLink>
          */}
        </nav>
      </aside>

      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
    </div>
  );
}
