// src/pages/admin/SportsMarginsPage.jsx
import { useEffect, useState } from 'react';
import { sportsApi } from '../../lib/api';

const card = {
  background: '#121722', border: '1px solid #1f2533', borderRadius: 12, padding: 16
};
const btn = { background: '#2563eb', border: 0, color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };
const btnGhost = { background: '#1f2937', border: '1px solid #374151', color: '#eaecef', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };
const ipt = { background: '#0f141f', border: '1px solid #273049', color: '#eaecef', borderRadius: 8, padding: '8px 10px' };

export default function SportsMarginsPage() {
  const [rows, setRows] = useState([]);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // form para upsert em lote (substitui existentes com mesmo league+market)
  const [form, setForm] = useState({
    league_code: '',
    market_code: '1X2',
    margin: 0.06
  });

  const load = async () => {
    setLoading(true);
    setErro('');
    try {
      const { data } = await sportsApi.listMargins();
      setRows(Array.isArray(data) ? data : (data?.items || []));
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao carregar margens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upsert = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = [{
        league_code: String(form.league_code).trim(),
        market_code: String(form.market_code).trim(),
        margin: Number(form.margin)
      }];
      await sportsApi.upsertMargins(payload);
      setForm({ ...form, margin: 0.06 });
      await load();
    } catch (e2) {
      setErro(e2?.response?.data?.erro || 'Erro ao salvar.');
    }
  };

  const remove = async (id) => {
    if (!confirm('Remover esta margem?')) return;
    setErro('');
    try {
      await sportsApi.removeMargin(id);
      await load();
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Erro ao remover.');
    }
  };

  const patch = async (id, margin) => {
    setErro('');
    try {
      await sportsApi.patchMargin(id, { margin: Number(margin) });
      await load();
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Erro ao atualizar.');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Margens de precificação</h2>
        <p style={{ opacity: .8, marginTop: -8 }}>Defina a margem (ex.: 0.06 = 6%) por liga + mercado.</p>

        <form onSubmit={upsert} style={{ display: 'grid', gap: 10, gridTemplateColumns: '220px 160px 160px auto' }}>
          <input
            style={ipt}
            placeholder="league_code (ex.: BRA_SERIEA)"
            value={form.league_code}
            onChange={(e) => setForm(f => ({ ...f, league_code: e.target.value }))}
            required
          />
          <input
            style={ipt}
            placeholder="market_code"
            value={form.market_code}
            onChange={(e) => setForm(f => ({ ...f, market_code: e.target.value }))}
            required
          />
          <input
            type="number" step="0.0001"
            style={ipt}
            placeholder="margin (ex: 0.06)"
            value={form.margin}
            onChange={(e) => setForm(f => ({ ...f, margin: e.target.value }))}
            required
          />
          <button style={btn}>Salvar / Upsert</button>
        </form>

        {erro && <div style={{ marginTop: 10, color: '#fecaca' }}>{erro}</div>}
      </section>

      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>Lista ({rows.length})</h3>
          <button style={btnGhost} onClick={load}>{loading ? 'Carregando…' : 'Atualizar'}</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: .7 }}>
                <th style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>ID</th>
                <th style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>League</th>
                <th style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>Market</th>
                <th style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>Margin</th>
                <th style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>{r.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>{r.league_code}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>{r.market_code}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>
                    <input
                      type="number" step="0.0001"
                      defaultValue={r.margin}
                      style={{ ...ipt, width: 120 }}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v)) return;
                        if (v !== r.margin) patch(r.id, v);
                      }}
                    />
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #1f2533' }}>
                    <button style={{ ...btnGhost, borderColor: '#7f1d1d' }} onClick={() => remove(r.id)}>Remover</button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan="5" style={{ padding: 12, opacity: .7 }}>Nenhuma margem cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
