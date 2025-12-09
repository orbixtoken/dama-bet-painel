// src/components/Sidebar.jsx
import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

function useUser() {
  return useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch {
      return {};
    }
  }, []);
}

export default function Sidebar() {
  const me = useUser();
  const role = String(me?.funcao || me?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'MASTER';

  // Menu do usuário
  const userItems = [
    { to: '/dashboard', label: 'Dashboard', exact: true },
    { to: '/cassino', label: 'Cassino' },
    { to: '/apostas', label: 'Apostas Cassino' }, // mantenha se a rota existir
    { to: '/saldo', label: 'Saldo' },
    // { to: '/indicacoes', label: 'Indique & Ganhe' }, // se habilitar
  ];

  // Menu do admin (só aparece para ADMIN/MASTER)
  const adminItems = isAdmin
    ? [
        { to: '/admin', label: 'Console Admin', exact: true },
        { to: '/admin/usuarios', label: 'Clientes (ativos)' },
        { to: '/admin/depositos', label: 'Depósitos' },
        { to: '/admin/withdrawals', label: 'Saques' },
        { to: '/admin/cassino/games-config', label: 'Config. de Jogos' },
      ]
    : [];

  const renderItem = (it) => (
    <li key={it.to}>
      <NavLink
        to={it.to}
        className={({ isActive }) => (isActive ? 'active' : undefined)}
        end={Boolean(it.exact)}
      >
        {it.label}
      </NavLink>
    </li>
  );

  return (
    <div className="sidebar">
      <h2>Tiger 67</h2>

      <nav>
        <ul>{userItems.map(renderItem)}</ul>

        {isAdmin && (
          <>
            <div className="sidebar-section-title">Admin</div>
            <ul>{adminItems.map(renderItem)}</ul>
          </>
        )}
      </nav>
    </div>
  );
}
