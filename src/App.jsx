// src/AppRoutes.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

import AdminShell from './components/AdminShell';
import OverviewPage from './pages/admin/OverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage';
import CasinoGamesConfigPage from './pages/admin/CasinoGamesConfigPage';
import DepositosPage from './pages/admin/DepositosPage';
import FinanceMovementsPage from './pages/admin/FinanceMovementsPage';

/** Guard: exige ADMIN/MASTER (lê várias formas de campo de função) */
function RequireAdmin({ children }) {
  try {
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');

    // aceita diferentes formatos vindos do backend
    const roleRaw =
      user?.funcao_user_role ??
      user?.funcao ??
      user?.role ??
      (Array.isArray(user?.roles) && user.roles[0]) ??
      '';

    // normaliza em array e testa
    const roles = []
      .concat(user?.roles || [])
      .concat(roleRaw ? [roleRaw] : [])
      .map((r) => String(r).toUpperCase());

    const ok = roles.some((r) => r === 'ADMIN' || r === 'MASTER' || r === 'SUPERADMIN');
    if (ok) return children;
  } catch {
    // ignore
  }
  return <Navigate to="/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Público / usuário */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />

      {/* Admin (protegido + shell) */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminShell />
          </RequireAdmin>
        }
      >
        {/* /admin => visão geral */}
        <Route index element={<OverviewPage />} />

        {/* IMPORTANTE: caminho RELATIVO (sem /) para renderizar dentro do AdminShell */}
        <Route path="movimentos" element={<FinanceMovementsPage />} />

        {/* /admin/usuarios */}
        <Route path="usuarios" element={<AdminUsersPage />} />

        {/* /admin/withdrawals */}
        <Route path="withdrawals" element={<AdminWithdrawalsPage />} />

        {/* /admin/depositos */}
        <Route path="depositos" element={<DepositosPage />} />

        {/* /admin/cassino/games-config */}
        <Route path="cassino">
          <Route path="games-config" element={<CasinoGamesConfigPage />} />
        </Route>

        {/* Redirects de compatibilidade (opcionais) */}
        <Route path="users" element={<Navigate to="/admin/usuarios" replace />} />
        <Route
          path="casino/games"
          element={<Navigate to="/admin/cassino/games-config" replace />}
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
