// src/pages/admin/AdminUsersPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { adminUsersApi } from '../../lib/api';

/* ===================== helpers de UI / regras ===================== */
const cargoInternoSet = new Set([
  'ADMIN', 'MASTER', 'GERENTE', 'GERENCIA', 'COBRANCA', 'COBRADOR',
  'POS-VENDA', 'POS_VENDA', 'PÓS-VENDA', 'SUPORTE'
]);

const isCargoInterno = (role) => cargoInternoSet.has(String(role || '').toUpperCase());
const isAdminRole   = (role) => ['ADMIN', 'MASTER'].includes(String(role || '').toUpperCase());

const roleLabel = (role) => (isCargoInterno(role) ? String(role).toUpperCase() : 'USUÁRIO');

const initials = (name = '', user = '') => {
  const base = (name || user || '').trim();
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('');
};

const Pill = ({ children, color = 'zinc', tone = 700 }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs border inline-flex items-center gap-1
    bg-${color}-800/40 border-${color}-${tone} text-${color}-100`.replaceAll('--', '-')}>
    {children}
  </span>
);

/** Mostra ou esconde a TABELA (deixa FALSE para mostrar só a contagem) */
const SHOW_TABLE = false;

/* ===================== página ===================== */
export default function AdminUsersPage() {
  // lista vinda do backend
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // paginação (usada apenas se SHOW_TABLE = true)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // filtros (mantidos para compatibilidade; UI escondida quando SHOW_TABLE=false)
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [onlyActive] = useState(true);     // travado como true para “Clientes (ativos)”
  const [onlyClients] = useState(true);    // esconde cargos internos
  const qTimer = useRef(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  /* ---------- debounce da busca ---------- */
  useEffect(() => {
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => clearTimeout(qTimer.current);
  }, [q]);

  /* ---------- normalizadores ---------- */
  function normalizeListResponse(data) {
    if (Array.isArray(data)) return { rows: data, total: data.length };
    if (data?.data) return { rows: Array.isArray(data.data) ? data.data : [], total: Number(data.total ?? data.count ?? 0) };
    if (data?.rows) return { rows: Array.isArray(data.rows) ? data.rows : [], total: Number(data.total ?? data.count ?? 0) };
    return { rows: [], total: 0 };
  }

  /* ---------- carregar lista ---------- */
  async function load(currentPage = 1, currentLimit = 10000, currentQ = '') {
    // quando só queremos a contagem, buscamos “largo” para contar tudo
    setLoading(true);
    setErr('');
    try {
      const { data } = await adminUsersApi.list({
        page: SHOW_TABLE ? currentPage : 1,
        limit: SHOW_TABLE ? currentLimit : 10000,
        q: currentQ || undefined
      });
      const norm = normalizeListResponse(data);
      setRows(norm.rows);
      setTotal(norm.total);
    } catch (e) {
      setErr(e?.response?.data?.erro || 'Falha ao carregar usuários.');
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // recarrega ao abrir
  useEffect(() => { load(); }, []);

  // recarrega quando busca muda (apenas se SHOW_TABLE for true)
  useEffect(() => {
    if (SHOW_TABLE) {
      setPage(1);
      load(1, limit, debouncedQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // recarrega quando pag/limit muda (apenas se SHOW_TABLE for true)
  useEffect(() => {
    if (SHOW_TABLE) load(page, limit, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  /* ---------- ações ---------- */
  async function toggleBlock(u) {
    // NUNCA permitir bloqueio de admin/master
    const role = u.funcao_user_role ?? u.funcao ?? u.role ?? '';
    if (isAdminRole(role)) {
      alert('Não é permitido bloquear conta administrativa.');
      return;
    }

    if (u.ativo) {
      const ok = confirm(`Bloquear o usuário ${u.nome || u.usuario}?`);
      if (!ok) return;
      const motivo = prompt(`Motivo (opcional)`, '') || '';
      try { setLoading(true); await adminUsersApi.block(u.id, motivo); await load(); }
      catch (e) { alert(e?.response?.data?.erro || 'Endpoint de bloqueio indisponível.'); }
      finally { setLoading(false); }
    } else {
      try { setLoading(true); await adminUsersApi.unblock(u.id); await load(); }
      catch (e) { alert(e?.response?.data?.erro || 'Endpoint de desbloqueio indisponível.'); }
      finally { setLoading(false); }
    }
  }

  /* ---------- filtragem visual (para contagem e tabela opcional) ---------- */
  const viewRows = useMemo(() => {
    return rows.filter(u => {
      const role = u.funcao_user_role || u.role || u.funcao;
      if (onlyActive && !u.ativo) return false;
      if (onlyClients && isCargoInterno(role)) return false; // remove ADMIN/MASTER/GERENTE/etc.
      if (SHOW_TABLE && debouncedQ) {
        const hay = `${u.nome||''} ${u.usuario||''}`.toLowerCase();
        if (!hay.includes(debouncedQ.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, onlyActive, onlyClients, debouncedQ]);

  // Quantidade de clientes ativos (exclui cargos internos)
  const qtdClientesAtivos = viewRows.length;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Clientes (ativos)</h1>

      {/* Cartão com a contagem — é o foco desta aba */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-sm opacity-80">Total de clientes ativos</div>
          <div className="mt-2 text-4xl font-bold">{loading ? '…' : qtdClientesAtivos}</div>
          {err && <div className="mt-3 text-sm text-red-300">{err}</div>}
          <div className="mt-4">
            <button
              onClick={() => load()}
              disabled={loading}
              className="px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
            >
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabela completa fica OCULTA por padrão — mude SHOW_TABLE para true se quiser enxergar */}
      {SHOW_TABLE && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Papel</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Criado em</th>
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="p-3" colSpan={6}>Carregando…</td></tr>}
              {!loading && viewRows.length === 0 && (
                <tr><td className="p-3 opacity-70" colSpan={6}>Nada por aqui.</td></tr>
              )}

              {viewRows.map((u, idx) => {
                const role = u.funcao_user_role ?? u.funcao ?? u.role ?? '';
                const mostravel = roleLabel(role);
                const ehInterno = isCargoInterno(role);
                const badge =
                  u.ativo
                    ? <Pill color="emerald" tone={700}>ativo</Pill>
                    : <Pill color="zinc" tone={700}>bloqueado</Pill>;

                return (
                  <tr key={u.id ?? u.usuario ?? idx} className={idx % 2 ? 'bg-zinc-900/40' : ''}>
                    <td className="p-3">#{u.id ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center text-xs">
                          {initials(u.nome, u.usuario)}
                        </div>
                        <div>
                          <div className="font-medium">{u.nome || '—'}</div>
                          <div className="opacity-70">{u.usuario}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Pill color={ehInterno ? 'amber' : 'sky'} tone={700}>
                        {mostravel}
                      </Pill>
                    </td>
                    <td className="p-3">{badge}</td>
                    <td className="p-3">
                      {u.criado_em ? new Date(u.criado_em).toLocaleString() :
                        u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        {/* 🔒 NÃO exibir “Bloquear” para ADMIN/MASTER */}
                        {!isAdminRole(role) && (
                          <button
                            className={`px-3 py-1.5 rounded-md ${u.ativo ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                            onClick={() => toggleBlock(u)}
                          >
                            {u.ativo ? 'Bloquear' : 'Desbloquear'}
                          </button>
                        )}
                        {isAdminRole(role) && <span className="text-xs opacity-60">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Paginação simplificada (ativa só quando SHOW_TABLE = true) */}
          <div className="flex items-center justify-between p-3 bg-zinc-900 border-t border-zinc-800">
            <div className="text-sm opacity-80">Página {page}</div>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <select
                className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}/página</option>)}
              </select>
              <button
                className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
