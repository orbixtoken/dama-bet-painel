// src/components/DashboardCards.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api'; // axios central com Authorization automático
import './DashboardCards.css';

/**
 * Endpoint do dashboard do Admin.
 * Pode sobrescrever via .env: VITE_ADMIN_DASHBOARD_ENDPOINT=/api/admin/dashboard
 * Fallbacks comuns: /api/admin/dashboard, /api/dashboard, /api/admin/overview
 */
const CANDIDATE_ENDPOINTS = [
  (import.meta.env.VITE_ADMIN_DASHBOARD_ENDPOINT || '').trim(),
  '/api/admin/dashboard',
  '/api/dashboard',
  '/api/admin/overview',
].filter(Boolean);

/** Normaliza diferentes formatos de resposta do backend */
function mapFromApi(raw = {}) {
  // aceita { data: {...} } ou direto
  const d = raw?.data && typeof raw.data === 'object' ? raw.data : raw;

  // alguns backends retornam em "metrics" ou "stats"
  const src =
    (typeof d.metrics === 'object' && d.metrics) ||
    (typeof d.stats === 'object' && d.stats) ||
    d;

  const n = (v) => {
    const num = Number(typeof v === 'string' ? v.replace(',', '.') : v);
    return Number.isFinite(num) ? num : 0;
  };

  return {
    usuariosAtivos:
      n(src.usuariosAtivos ?? src.usuarios_ativos ?? src.active_users ?? src.users_active),
    apostasCassinoHoje:
      n(src.apostasCassinoHoje ?? src.casino_bets_today ?? src.casino_apostas_hoje ?? src.bets_today),
    receitaBrutaCassino:
      n(src.receitaBrutaCassino ?? src.casino_ggr ?? src.receita_bruta_cassino ?? src.ggr),
    saquesPendentes:
      n(src.saquesPendentes ?? src.pending_withdrawals ?? src.saques_pendentes),
  };
}

const fmtMoneyBRL = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const fmtInt = (v) =>
  new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

export default function DashboardCards() {
  const [stats, setStats] = useState(() => mapFromApi({}));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [lastEndpoint, setLastEndpoint] = useState('');
  const refAlive = useRef(true);

  // refetch quando trocar o token em outra aba ou após login/logout
  const [bump, setBump] = useState(0);
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'token' || e.key === 'accessToken' || e.key === 'access_token') {
        setBump((x) => x + 1);
      }
    }
    function onAuthChanged() {
      // caso sua app dispare window.dispatchEvent(new Event('auth:changed'))
      setBump((x) => x + 1);
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:changed', onAuthChanged);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:changed', onAuthChanged);
    };
  }, []);

  useEffect(() => {
    refAlive.current = true;

    async function tryEndpointsSequentially() {
      if (!refAlive.current) return;
      setLoading(true);
      setErro('');
      let lastErr = null;

      for (const ep of CANDIDATE_ENDPOINTS) {
        try {
          const { data } = await api.get(ep);
          if (!refAlive.current) return;
          setStats(mapFromApi(data));
          setLastEndpoint(ep);
          setLoading(false);
          return; // sucesso
        } catch (e) {
          lastErr = e;
          setLastEndpoint(ep);
          // tenta o próximo endpoint
        }
      }

      // se chegou aqui, falhou em todos
      if (!refAlive.current) return;
      setErro(
        lastErr?.response?.data?.erro ||
          lastErr?.message ||
          'Falha ao carregar indicadores.'
      );
      setLoading(false);
    }

    tryEndpointsSequentially();
    const t = setInterval(tryEndpointsSequentially, 30_000); // atualiza a cada 30s
    return () => {
      refAlive.current = false;
      clearInterval(t);
    };
  }, [bump]);

  const cards = useMemo(
    () => [
      { title: 'Usuários Ativos', value: fmtInt(stats.usuariosAtivos) },
      { title: 'Apostas Cassino (hoje)', value: fmtInt(stats.apostasCassinoHoje) },
      { title: 'Receita Bruta Cassino', value: fmtMoneyBRL(stats.receitaBrutaCassino) },
      { title: 'Saques Pendentes', value: fmtInt(stats.saquesPendentes) },
    ],
    [stats]
  );

  if (loading) {
    return (
      <div className="cards-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card skeleton" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <div className="cards-grid">
        <div className="card error">
          <h3>Erro</h3>
          <p style={{ marginBottom: 8 }}>{erro}</p>
          {lastEndpoint && (
            <p style={{ opacity: 0.7, fontSize: 12 }}>
              Tentativa mais recente: <code>{lastEndpoint}</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cards-grid">
      {cards.map((card, index) => (
        <div key={index} className="card">
          <h3>{card.title}</h3>
          <p>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
