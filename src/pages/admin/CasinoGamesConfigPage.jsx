// src/pages/admin/CasinoGamesConfigPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { casinoAdminApi } from '../../lib/api';

/* ======== estilos básicos (dark) ======== */
const box = { background: '#0f1420', border: '1px solid #1b2231', borderRadius: 12, padding: 16, marginTop: 12 };
const row = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const input = { background: '#0b1220', color: '#eaecef', border: '1px solid #1b2231', borderRadius: 8, padding: '8px 10px' };
const btn = { background: '#2563eb', color: '#fff', border: 0, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' };
const btnGhost = { background: '#0b1220', color: '#eaecef', border: '1px solid #1b2231', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' };
const tag = (c) => ({ background: c, color: '#0b0f14', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 800 });

/** ✅ Jogos habilitados para ESTE cliente */
const ALLOWED_SLUGS = ['coinflip', 'dice', 'slots_common'];

/* ======== helpers simples ======== */
const pct = (x) => `${(Number(x || 0) * 100).toFixed(2)}%`;
const safeNum = (v, d=0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function InfoCallout() {
  return (
    <div style={{ ...box, borderStyle: 'dashed', borderColor: '#2a3650' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Como operar (explicação simples)</div>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5, opacity: 0.95 }}>
        <li><b>RTP</b> é o quanto “volta” pro jogador. Ex.: RTP 0.93 ⇒ volta ~93% ao longo do tempo.</li>
        <li><b>Edge</b> (vantagem da casa) = <code>1 − RTP</code>. Ex.: RTP 0.93 ⇒ Edge ~7% para a casa.</li>
        <li><b>Promoções</b>: aumente o RTP (mais vitórias). Pós-promo: reduza o RTP (menos vitórias).</li>
        <li><b>Stake mínima/máxima</b>: limites por aposta.</li>
        <li>
          <b>extra (JSON)</b>:
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><b>coinflip</b>: <code>{`{"payout_multiplier": 2}`}</code> (padrão 2.0).</li>
            <li><b>dice</b>: <code>{`{"six_exact_multiplier": 6}`}</code> (padrão 6.0 para acertar o número).</li>
            <li><b>slots_common</b>: <code>{`{"paytable":[{"mult":2,"w":10}, ...]}`}</code>. <i>w</i> é peso (chance relativa).</li>
          </ul>
        </li>
      </ul>
    </div>
  );
}

export default function CasinoGamesConfigPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [editingSlug, setEditingSlug] = useState('');

  const [form, setForm] = useState({
    game_slug: '',
    ativo: true,
    rtp_target: 0.93,
    min_stake: 1,
    max_stake: 1000,
    extra: {}, // por jogo
  });

  const [extraText, setExtraText] = useState('{}');
  const [extraErr, setExtraErr] = useState('');

  /* ======== dicas contextuais por jogo ======== */
  const hintExtra = useMemo(() => {
    switch (form.game_slug) {
      case 'coinflip':
        return `// COINFLIP
// payout_multiplier: multiplicador quando acerta (padrão 2.0)
{
  "payout_multiplier": 2
}`;
      case 'dice':
        return `// DICE
// six_exact_multiplier: multiplicador ao acertar o número exato (padrão 6.0)
{
  "six_exact_multiplier": 6
}`;
      case 'slots_common':
        return `// SLOTS
// paytable: lista de resultados com multiplicador (mult) e peso (w)
// quanto maior o "w", mais provável aquele prêmio.
// Exemplo básico:
{
  "paytable": [
    { "mult": 0,   "w": 640 },
    { "mult": 1.2, "w": 220 },
    { "mult": 2,   "w": 90  },
    { "mult": 5,   "w": 40  },
    { "mult": 20,  "w": 10  }
  ]
}`;
      default:
        return '{}';
    }
  }, [form.game_slug]);

  /* ======== carregar lista ======== */
  const load = async () => {
    setLoading(true); setErro('');
    try {
      const { data } = await casinoAdminApi.list();
      const items = data?.items || [];
      setRows(items.filter(r => ALLOWED_SLUGS.includes(r.game_slug)));
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao carregar configs.');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ======== estado/edição ======== */
  const reset = () => {
    setEditingSlug('');
    setForm({
      game_slug: '',
      ativo: true,
      rtp_target: 0.93,
      min_stake: 1,
      max_stake: 1000,
      extra: {},
    });
    setExtraText('{}');
    setExtraErr('');
  };

  const edit = (r) => {
    setEditingSlug(r.game_slug);
    const extraObj = r.extra || {};
    setForm({
      game_slug: r.game_slug,
      ativo: !!r.ativo,
      rtp_target: Number(r.rtp_target),
      min_stake: Number(r.min_stake),
      max_stake: Number(r.max_stake),
      extra: extraObj,
    });
    setExtraText(JSON.stringify(extraObj, null, 2));
    setExtraErr('');
  };

  /* ======== presets (um clique) ======== */
  const applyPreset = (kind) => {
    let rtp, note;
    switch (kind) {
      case 'promo':
        rtp = 0.98; note = 'Promo generoso (mais vitórias)'; break;
      case 'balance':
        rtp = 0.93; note = 'Equilíbrio (padrão recomendado)'; break;
      case 'post':
        rtp = 0.85; note = 'Pós-promo mais rígido'; break;
      case 'ultra':
        rtp = 0.50; note = 'Ultra-teste (apenas para laboratório)'; break;
      default:
        rtp = form.rtp_target; note = '';
    }
    setForm(f => ({ ...f, rtp_target: rtp }));
    if (note) alert(`${note}\nRTP ajustado para ${rtp} (${pct(rtp)}).`);
  };

  /* ======== confirmação para RTP extremos ======== */
  const confirmExtreme = (rtp) => {
    const r = Number(rtp);
    if (r <= 0.6 || r >= 0.99) {
      return confirm(
        `RTP escolhido: ${r} (${pct(r)}).\n` +
        `Valores muito extremos podem causar fluxo anormal de vitórias/derrotas.\n` +
        `Deseja continuar mesmo assim?`
      );
    }
    return true;
  };

  /* ======== parse/validação JSON do extra ======== */
  useEffect(() => {
    try {
      const obj = JSON.parse(extraText || '{}');
      setExtraErr('');
      setForm(f => ({ ...f, extra: obj }));
    } catch (e) {
      setExtraErr('JSON inválido. Corrija o campo "extra".');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraText]);

  /* ======== submissão ======== */
  const submit = async (e) => {
    e.preventDefault(); setErro('');

    if (!ALLOWED_SLUGS.includes(form.game_slug)) {
      setErro('Este jogo não está habilitado para este cliente.');
      return;
    }
    if (extraErr) {
      setErro('Corrija o JSON do campo "extra" antes de salvar.');
      return;
    }
    if (!confirmExtreme(form.rtp_target)) return;

    try {
      const payload = {
        ativo: !!form.ativo,
        rtp_target: Number(form.rtp_target),
        min_stake: Number(form.min_stake),
        max_stake: Number(form.max_stake),
        extra: form.extra,
      };

      if (!editingSlug) {
        await casinoAdminApi.upsert(form.game_slug, payload);
      } else {
        await casinoAdminApi.patch(editingSlug, payload);
      }
      reset(); await load();
    } catch (e2) {
      setErro(e2?.response?.data?.erro || 'Falha ao salvar configuração.');
    }
  };

  const inativar = async (slug) => {
    if (!confirm(`Inativar ${slug}?`)) return;
    setErro('');
    try { await casinoAdminApi.deactivate(slug); await load(); }
    catch (e) { setErro(e?.response?.data?.erro || 'Falha ao inativar.'); }
  };

  /* ======== resumo rápido do formulário ======== */
  const edge = useMemo(() => Math.max(0, 1 - safeNum(form.rtp_target, 0)), [form.rtp_target]);

  /* ======== dicas por jogo (topo do editor) ======== */
  const gameTip = useMemo(() => {
    if (!form.game_slug) return '';
    if (form.game_slug === 'coinflip')
      return 'Coinflip: “payout_multiplier” define o pagamento quando acerta (padrão 2.0). RTP alto ≈ mais acertos.';
    if (form.game_slug === 'dice')
      return 'Dice: “six_exact_multiplier” define o pagamento por acertar o número exato (padrão 6.0).';
    if (form.game_slug === 'slots_common')
      return 'Slots: use “paytable” (mult/w) para modelar prêmios. O sistema ajusta pesos para aproximar o RTP alvo.';
    return '';
  }, [form.game_slug]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Configurações de Jogos (Cassino)</h1>

      <InfoCallout />

      {/* Editor */}
      <form onSubmit={submit} style={box}>
        <div style={{ ...row, justifyContent: 'space-between' }}>
          <div style={row}>
            {/* ▼ restrito aos 3 jogos combinados */}
            <select
              style={{ ...input, minWidth: 200 }}
              value={form.game_slug}
              onChange={(e) => {
                const v = e.target.value;
                setForm(f => ({ ...f, game_slug: v }));
                // troca a dica do extra
                setExtraText('{}');
                setExtraErr('');
              }}
              disabled={!!editingSlug}
              required={!editingSlug}
            >
              <option value="">Selecione o jogo…</option>
              {ALLOWED_SLUGS.map(slug => (
                <option key={slug} value={slug}>{slug}</option>
              ))}
            </select>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={!!form.ativo}
                onChange={(e) => setForm(f => ({ ...f, ativo: e.target.checked }))}
              />
              ativo
            </label>

            <input
              type="number" step="0.0001"
              style={input}
              placeholder="rtp_target (ex.: 0.93)"
              value={form.rtp_target}
              onChange={(e) => setForm(f => ({ ...f, rtp_target: e.target.value }))}
              required
              title="Quanto volta para o jogador ao longo do tempo (0..1)."
            />

            <input
              type="number" step="0.01"
              style={input}
              placeholder="min_stake"
              value={form.min_stake}
              onChange={(e) => setForm(f => ({ ...f, min_stake: e.target.value }))}
              required
              title="Valor mínimo de aposta"
            />

            <input
              type="number" step="0.01"
              style={input}
              placeholder="max_stake"
              value={form.max_stake}
              onChange={(e) => setForm(f => ({ ...f, max_stake: e.target.value }))}
              required
              title="Valor máximo de aposta"
            />
          </div>

          {/* Resumo curto (RTP/Edge) */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={tag('#bbf7d0')}>RTP {pct(form.rtp_target)}</span>
            <span style={tag('#fde68a')}>Edge {pct(edge)}</span>
          </div>
        </div>

        {gameTip && (
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
            {gameTip}
          </div>
        )}

        {/* Presets */}
        <div style={{ ...row, marginTop: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Presets rápidos:</span>
          <button type="button" style={btnGhost} onClick={() => applyPreset('promo')}>Promo generoso (0.98)</button>
          <button type="button" style={btnGhost} onClick={() => applyPreset('balance')}>Equilíbrio (0.93)</button>
          <button type="button" style={btnGhost} onClick={() => applyPreset('post')}>Pós-promo (0.85)</button>
          <button type="button" style={btnGhost} onClick={() => applyPreset('ultra')}>Ultra-teste (0.50)</button>
        </div>

        {/* extra (JSON) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: .8, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>extra (JSON)</span>
            <button
              type="button"
              style={{ ...btnGhost, padding: '6px 10px' }}
              onClick={() => setExtraText(hintExtra.split('\n').slice(2).join('\n') /* sem os comentários iniciais */)}
              title="Inserir exemplo"
            >
              Inserir exemplo
            </button>
          </div>

          <textarea
            rows={10}
            style={{ ...input, width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            placeholder={hintExtra}
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
          />
          {extraErr && <div style={{ color: '#fecaca', marginTop: 6 }}>{extraErr}</div>}
        </div>

        {/* ações */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={btn} disabled={!!extraErr}>{editingSlug ? 'Atualizar' : 'Criar/Upsert'}</button>
          {editingSlug && (
            <button type="button" onClick={reset} style={btnGhost}>Cancelar edição</button>
          )}
        </div>

        {erro && <div style={{ marginTop: 10, color: '#fecaca' }}>{erro}</div>}
      </form>

      {/* Lista */}
      <div style={box}>
        <div style={{ marginBottom: 10, opacity: .8 }}>
          {loading ? 'Carregando…' : `${rows.length} jogo(s) configurado(s)`}
        </div>

        {rows.map((r) => {
          const rtp = safeNum(r.rtp_target, 0);
          const eg = Math.max(0, 1 - rtp);
          return (
            <div
              key={r.game_slug}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #141a26' }}
            >
              <div style={{ fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>
                  {r.game_slug} {!r.ativo && <span style={{ opacity: 0.7 }}>(inativo)</span>}
                </div>
                <div style={{ opacity: .9 }}>
                  RTP: <b>{rtp}</b> (<span title="Vantagem da casa">Edge</span> {pct(eg)}) • Stake: {r.min_stake} .. {r.max_stake}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => edit(r)} style={btnGhost}>Editar</button>
                <button onClick={() => inativar(r.game_slug)} style={btn}>Inativar</button>
              </div>
            </div>
          );
        })}

        {!loading && rows.length === 0 && (
          <div style={{ opacity: .7 }}>Nenhum jogo configurado.</div>
        )}
      </div>
    </div>
  );
}
