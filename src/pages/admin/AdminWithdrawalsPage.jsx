// src/pages/admin/AdminWithdrawalsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { adminWithdrawalsApi } from '../../lib/api'; // <- usa o service certo
import './admin-withdrawals.css';

const fmtMoney = (n) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const Badge = ({ status }) => {
  const map = {
    pendente: { bg: '#3f3f46', color: '#e5e7eb' },
    aprovado: { bg: '#1d4ed8', color: '#fff' },
    recusado: { bg: '#991b1b', color: '#fff' },
    pago: { bg: '#065f46', color: '#ecfdf5' },
  };
  const s = map[status] || map.pendente;
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: s.bg,
        color: s.color,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
};

function toIsoOrUndefined(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [status, setStatus] = useState('pendente');
  const [usuarioId, setUsuarioId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const pages = useMemo(
    () => Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1))),
    [total, pageSize]
  );

  async function load() {
    setLoading(true);
    setErro('');
    try {
      const { data } = await adminWithdrawalsApi.list({
        status: status || undefined,
        usuario_id: usuarioId || undefined,
        from: toIsoOrUndefined(from),
        to: toIsoOrUndefined(to),
        page,
        pageSize,
      });
      setRows(data?.items || data?.rows || []);
      setTotal(Number(data?.total ?? data?.count ?? (data?.items?.length || 0)));
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
      setErro(e?.response?.data?.erro || 'Falha ao carregar saques.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status, usuarioId, from, to]);

  function applyFilters(e) {
    e?.preventDefault?.();
    setPage(1);
  }

  function clearFilters() {
    setStatus('');
    setUsuarioId('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  async function confirmarAcao(id, targetStatus) {
    const labels = {
      aprovado: 'Aprovar',
      recusado: 'Recusar',
      pago: 'Marcar como pago',
    };

    let motivo;
    if (targetStatus === 'recusado') {
      motivo = prompt('Informe o motivo da recusa (obrigatório):', '');
      if (!motivo) return;
    }

    const ok = confirm(`${labels[targetStatus]} o saque #${id}?`);
    if (!ok) return;

    try {
      setLoading(true);
      // ✅ usa o service que já aponta para /api/admin/saques/:id/status
      await adminWithdrawalsApi.patchStatus(
        id,
        targetStatus,
        targetStatus === 'recusado' ? motivo : undefined
      );
      await load();
    } catch (e) {
      alert(e?.response?.data?.erro || 'Falha ao atualizar status.');
    } finally {
      setLoading(false);
    }
  }

  async function copyPix(id, chavePix) {
    try {
      await navigator.clipboard.writeText(String(chavePix || ''));
      setCopiedId(id);
    } catch {
      const v = String(chavePix || '');
      window.prompt('Copie a chave PIX (Ctrl+C):', v);
      setCopiedId(id);
    } finally {
      setTimeout(() => setCopiedId(null), 1200);
    }
  }

  const fmtDate = (v) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d.toLocaleString() : '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Saques (Admin)</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm"
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {/* Filtros */}
      <form
        onSubmit={applyFilters}
        className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3"
      >
        {erro && <div className="mb-2 text-red-300 text-sm">{erro}</div>}

        <div className="grid md:grid-cols-6 gap-3">
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">(Todos status)</option>
            <option value="pendente">pendente</option>
            <option value="aprovado">aprovado</option>
            <option value="recusado">recusado</option>
            <option value="pago">pago</option>
          </select>

          <input
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
            placeholder="usuario_id"
            value={usuarioId}
            onChange={(e) => {
              setUsuarioId(e.target.value.replace(/\D/g, ''));
              setPage(1);
            }}
          />

          <input
            type="datetime-local"
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
          <input
            type="datetime-local"
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
            value={pageSize}
            onChange={(e) => {
              const n = Number(e.target.value) || 20;
              setPageSize(n);
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/página
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-md px-3 py-2"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
            >
              Limpar
            </button>
          </div>
        </div>
      </form>

      {/* Lista */}
      <div className="rounded-lg border border-zinc-800 overflow-x-auto p-2">
        <table className="aw-table w-full text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th className="min-w-[220px]">Usuário</th>
              <th className="w-36">Valor</th>
              <th className="w-32">Status</th>
              <th className="min-w-[260px]">Chave PIX</th>
              <th className="w-56">Criado em</th>
              <th className="w-56">Atualizado em</th>
              <th className="min-w-[200px]">Motivo recusa</th>
              <th className="w-56 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr className="aw-row">
                <td className="aw-td" colSpan={9}>Carregando…</td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr className="aw-row">
                <td className="aw-td muted" colSpan={9}>Nenhum saque encontrado.</td>
              </tr>
            )}

            {rows.map((r) => {
              const nome = r.nome_usuario || r.nome || '—';
              const login = r.login || r.usuario || r.email || r.usuario_id || '—';
              const pix = r.pix_chave || r.chave_pix || '';
              const d = (v) => (v ? new Date(v).toLocaleString() : '—');

              return (
                <tr key={r.id} className="aw-row">
                  <td className="aw-td mono">#{r.id}</td>

                  <td className="aw-td">
                    <div className="aw-user">
                      <div className="name">{nome}</div>
                      <div className="sub">{login}</div>
                    </div>
                  </td>

                  <td className="aw-td mono">{fmtMoney(r.valor)}</td>
                  <td className="aw-td"><Badge status={r.status} /></td>

                  <td className="aw-td">
                    {pix ? (
                      <div className="aw-pix">
                        <code className="code" title={pix}>{pix}</code>
                        <button
                          type="button"
                          onClick={() => copyPix(r.id, pix)}
                          className={`copy ${copiedId === r.id ? 'ok' : ''}`}
                          title="Copiar chave PIX"
                        >
                          {copiedId === r.id ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>

                  <td className="aw-td mono">{d(r.created_at || r.criado_em)}</td>
                  <td className="aw-td mono">{d(r.updated_at || r.atualizado_em)}</td>
                  <td className="aw-td">{r.motivo_recusa || r.motivo || '—'}</td>

                  <td className="aw-td">
                    <div className="aw-actions">
                      {r.status === 'pendente' && (
                        <>
                          <button
                            className="btn primary"
                            disabled={loading}
                            onClick={() => confirmarAcao(r.id, 'aprovado')}
                          >
                            Aprovar
                          </button>
                          <button
                            className="btn danger"
                            disabled={loading}
                            onClick={() => confirmarAcao(r.id, 'recusado')}
                          >
                            Recusar
                          </button>
                        </>
                      )}
                      {r.status === 'aprovado' && (
                        <button
                          className="btn success"
                          disabled={loading}
                          onClick={() => confirmarAcao(r.id, 'pago')}
                        >
                          Marcar pago
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex items-center justify-between p-3 bg-zinc-900 border-t border-zinc-800 rounded-b-lg">
          <div className="text-sm opacity-80">
            Total: {total} • Página {page} / {pages}
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
