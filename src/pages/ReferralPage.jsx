// src/pages/ReferralPage.jsx
import { useEffect, useState } from 'react';
import api from '../lib/api'; // axios com Authorization

const styles = {
  card: {
    background: '#121722',
    border: '1px solid #1f2533',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  input: {
    background: '#0f172a',
    border: '1px solid #253047',
    color: '#eaecef',
    borderRadius: 8,
    padding: '8px 10px',
  },
  btn: {
    background: '#2563eb',
    color: '#fff',
    border: 0,
    borderRadius: 8,
    padding: '9px 12px',
    cursor: 'pointer',
  },
  small: { opacity: 0.8, fontSize: 13 },
  error: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#2a1010',
    border: '1px solid #7f1d1d',
    color: '#fecaca',
    borderRadius: 8,
  },
  ok: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#102a14',
    border: '1px solid #1d7f3a',
    color: '#c7f9cc',
    borderRadius: 8,
  },
};

export default function ReferralPage() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      const { data } = await api.get('/api/referrals/me');
      // valores padrão seguros caso o backend não envie algum campo
      setPayload({
        share_link: data?.share_link || '',
        week_points: Number(data?.week_points || 0),
        week_start: data?.week_start || null,
        rules: {
          signup_points: Number(data?.rules?.signup_points || 0),
          first_deposit_points: Number(data?.rules?.first_deposit_points || 0),
          min_first_deposit: Number(data?.rules?.min_first_deposit || 0),
          threshold_points: Number(data?.rules?.threshold_points || 0),
          reward_credits: Number(data?.rules?.reward_credits || 0),
        },
        referrals: Array.isArray(data?.referrals) ? data.referrals : [],
      });
    } catch (e) {
      setErr(e?.response?.data?.erro || 'Falha ao carregar suas informações de indicação.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <h1 style={{ margin: '8px 0 14px' }}>Indique &amp; Ganhe</h1>
        <div style={styles.card}>
          <div style={styles.small}>Carregando…</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <h1 style={{ margin: '8px 0 14px' }}>Indique &amp; Ganhe</h1>
        <div style={{ ...styles.card, ...styles.error }}>{err}</div>
      </div>
    );
  }

  const d = payload || {};
  const canClaim = d.week_points >= d.rules.threshold_points;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, color: '#eaecef' }}>
      <h1 style={{ margin: '8px 0 14px' }}>Indique &amp; Ganhe</h1>

      <div style={styles.card}>
        <div style={styles.row}>
          <input
            style={{ ...styles.input, flex: 1 }}
            readOnly
            value={d.share_link}
            onFocus={(e) => e.target.select()}
          />
          <button
            style={styles.btn}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(d.share_link || '');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // fallback
              }
            }}
          >
            Copiar link
          </button>
        </div>
        <div style={{ ...styles.row, marginTop: 10, justifyContent: 'space-between' }}>
          <div>
            <div>
              Pontos desta semana: <b>{d.week_points}</b>
            </div>
            <div style={styles.small}>
              Semana iniciada em{' '}
              {d.week_start ? new Date(d.week_start).toLocaleDateString() : '—'}
            </div>
          </div>
          <div>
            <button
              style={{ ...styles.btn, opacity: canClaim ? 1 : 0.7, cursor: canClaim ? 'pointer' : 'not-allowed' }}
              disabled={!canClaim}
              onClick={async () => {
                setMsg('');
                setErr('');
                try {
                  const r = await api.post('/api/referrals/claim-weekly');
                  setMsg(`Bônus de R$ ${Number(r?.data?.credited || 0).toFixed(2)} creditado!`);
                  await load();
                } catch (e) {
                  setErr(e?.response?.data?.erro || 'Falha ao resgatar.');
                }
              }}
            >
              Resgatar (alvo {d.rules.threshold_points})
            </button>
          </div>
        </div>
        {copied && <div style={styles.ok}>Link copiado para a área de transferência.</div>}
        {msg && <div style={styles.ok}>{msg}</div>}
        {err && <div style={styles.error}>{err}</div>}
      </div>

      <div style={styles.card}>
        <h3>Seus indicados</h3>
        {(!d.referrals || d.referrals.length === 0) && (
          <div style={styles.small}>Ninguém ainda. Compartilhe seu link!</div>
        )}
        {(d.referrals || []).map((r) => (
          <div
            key={r.id ?? `${r.email}-${r.joined_at ?? ''}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #1f2533',
              padding: '10px 4px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{r.nome || r.email || `#${r.id}`}</div>
              <div style={styles.small}>
                Entrou em {r.joined_at ? new Date(r.joined_at).toLocaleDateString() : '—'}
              </div>
            </div>
            <div style={styles.small}>
              1º depósito:{' '}
              {r.first_deposit_at
                ? new Date(r.first_deposit_at).toLocaleDateString()
                : 'não'}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h3>Regras</h3>
        <ul style={styles.small}>
          <li>+{d.rules.signup_points} pts por cadastro válido via seu link;</li>
          <li>
            +{d.rules.first_deposit_points} pts no primeiro depósito do indicado (mín. R${' '}
            {d.rules.min_first_deposit});
          </li>
          <li>
            Ao atingir {d.rules.threshold_points} pts na semana, você pode resgatar R${' '}
            {d.rules.reward_credits} em créditos no cassino.
          </li>
          <li>Créditos são de uso interno (podem ter requisito de aposta para saque).</li>
        </ul>
      </div>
    </div>
  );
}
