// src/pages/admin/AdminDepositsPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { adminDepositsApi } from '../../lib/api';

const fmtMoney = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));

function toIsoOrUndefined(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

const Badge = ({ status }) => {
  const map = {
    pendente: { bg: '#3f3f46', color: '#e5e7eb' },
    aprovado: { bg: '#065f46', color: '#ecfdf5' },
    recusado: { bg: '#991b1b', color: '#fff' },
  };
  const s = map[status] || map.pendente;
  return (
    <span style={{ padding:'2px 8px', borderRadius:999, fontSize:12, background:s.bg, color:s.color, textTransform:'capitalize' }}>
      {status}
    </span>
  );
};

export default function AdminDepositsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [status, setStatus] = useState('pendente');
  const [usuarioId, setUsuarioId] = useState('');
  const [ref, setRef] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const pages = useMemo(
    () => Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 1))),
    [total, pageSize]
  );

  async function load() {
    setLoading(true);
    setErro('');
    try {
      const { data } = await adminDepositsApi.list({
        status: status || undefined,
        usuario_id: usuarioId || undefined,
        ref: ref || undefined,
        from: toIsoOrUndefined(from),
        to: toIsoOrUndefined(to),
        page,
        pageSize,
      });
      setRows(data?.items || []);
      setTotal(Number(data?.total || 0));
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao carregar depósitos.');
      setRows([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, pageSize, status, usuarioId, ref, from, to]);

  async function confirmar(id, target) {
    const labels = { aprovado: 'Aprovar (creditar)', recusado: 'Recusar' };
    let motivo;
    if (target === 'recusado') {
      motivo = prompt('Motivo da recusa (opcional):', '') || '';
    }
    if (!confirm(`${labels[target]} depósito #${id}?`)) return;
    try {
      setLoading(true);
      await adminDepositsApi.patchStatus(id, target, motivo);
      await load();
    } catch (e) {
      alert(e?.response?.data?.erro || 'Falha ao atualizar.');
    } finally { setLoading(false); }
  }

  function clearFilters() {
    setStatus('');
    setUsuarioId('');
    setRef('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Depósitos (Admin)</h1>
        <button onClick={load} disabled={loading} className="px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-sm">
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      <form onSubmit={(e)=>{e.preventDefault(); setPage(1);}} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        {erro && <div className="mb-2 text-red-300 text-sm">{erro}</div>}
        <div className="grid md:grid-cols-7 gap-3">
          <select className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2" value={status} onChange={(e)=>{setStatus(e.target.value); setPage(1);}}>
            <option value="">(Todos)</option>
            <option value="pendente">pendente</option>
            <option value="aprovado">aprovado</option>
            <option value="recusado">recusado</option>
          </select>
          <input className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2" placeholder="usuario_id"
                 value={usuarioId} onChange={(e)=>{setUsuarioId(e.target.value.replace(/\D/g,'')); setPage(1);}} />
          <input className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2" placeholder="código ref (RF...)"
                 value={ref} onChange={(e)=>{setRef(e.target.value.trim()); setPage(1);}} />
          <input type="datetime-local" className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
                 value={from} onChange={(e)=>{setFrom(e.target.value); setPage(1);}} />
          <input type="datetime-local" className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2"
                 value={to} onChange={(e)=>{setTo(e.target.value); setPage(1);}} />
          <select className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2" value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)||20); setPage(1);}}>
            {[10,20,50,100].map(n=><option key={n} value={n}>{n}/página</option>)}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-md px-3 py-2">Aplicar</button>
            <button type="button" onClick={clearFilters} className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2">Limpar</button>
          </div>
        </div>
      </form>

      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Usuário</th>
              <th className="text-left p-3">Valor</th>
              <th className="text-left p-3">Ref</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Criado</th>
              <th className="text-left p-3">Atualizado</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-3" colSpan={8}>Carregando…</td></tr>}
            {!loading && rows.length === 0 && <tr><td className="p-3 opacity-70" colSpan={8}>Nenhum depósito encontrado.</td></tr>}
            {rows.map((r)=>(
              <tr key={r.id} className="border-b border-zinc-800">
                <td className="p-3">#{r.id}</td>
                <td className="p-3">
                  <div className="font-medium">{r.nome_usuario || r.nome || '—'}</div>
                  <div className="opacity-70">{r.login || r.usuario || r.email || r.usuario_id}</div>
                </td>
                <td className="p-3">{fmtMoney(r.valor)}</td>
                <td className="p-3"><code>{r.codigo_ref || '—'}</code></td>
                <td className="p-3"><Badge status={r.status} /></td>
                <td className="p-3">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                <td className="p-3">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    {r.status === 'pendente' && (
                      <>
                        <button className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white"
                                onClick={()=>confirmar(r.id,'aprovado')}>Aprovar</button>
                        <button className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white"
                                onClick={()=>confirmar(r.id,'recusado')}>Recusar</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between p-3 bg-zinc-900">
          <div className="text-sm opacity-80">Total: {total} • Página {page} / {pages}</div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
                    disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
            <button className="px-3 py-1.5 rounded-md bg-zinc-800 border border-zinc-700"
                    disabled={page>=pages || loading} onClick={()=>setPage(p=>Math.min(pages,p+1))}>Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}
