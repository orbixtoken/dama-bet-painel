// src/pages/DashboardPage.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeiroApi, cassinoApi } from '../lib/api';

const money = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));

export default function DashboardPage() {
  const navigate = useNavigate();

  const [me] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario') || '{}'); } catch { return {}; }
  });

  const isAdmin = useMemo(() => {
    const r = String(me?.funcao || '').toUpperCase();
    return r === 'ADMIN' || r === 'MASTER';
  }, [me]);

  const [loading, setLoading] = useState(false);
  const [saldo, setSaldo] = useState(null);
  const [error, setError] = useState('');
  const [lastAt, setLastAt] = useState(null);

  const firstName = useMemo(
    () => (me?.nome || me?.username || me?.usuario || 'usuário').split(' ')[0],
    [me]
  );

  const inFlight = useRef(false);
  const refreshTimer = useRef(null);

  async function fetchSaldo() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const { data } = await financeiroApi.saldo();
      setSaldo(data);
      setLastAt(new Date());
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.erro || 'Falha ao carregar saldo.');
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  useEffect(() => {
    // primeira carga
    fetchSaldo();

    // auto refresh a cada 30s
    refreshTimer.current = setInterval(fetchSaldo, 30000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, []);

  async function depositar(valor = 10) {
    setLoading(true);
    setError('');
    try {
      await financeiroApi.depositar(valor, `Depósito rápido R$ ${valor}`);
      await fetchSaldo();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.erro || 'Não foi possível depositar.');
    } finally {
      setLoading(false);
    }
  }

  async function jogarCoinflip(stake = 1, bet = 'heads') {
    setLoading(true);
    setError('');
    try {
      const { data } = await cassinoApi.coinflipPlay(stake, bet);
      alert(`Coinflip: ${String(data.result).toUpperCase()} | payout: ${money(data.payout || 0)}`);
      await fetchSaldo();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.erro || 'Não foi possível jogar Coinflip.');
    } finally {
      setLoading(false);
    }
  }

  // ➕ novos jogos rápidos

  async function jogarDice(stake = 1, target = 3) {
    setLoading(true);
    setError('');
    try {
      const { data } = await cassinoApi.dicePlay(stake, target);
      alert(`Dice: saiu ${data.roll} | payout: ${money(data.payout || 0)}`);
      await fetchSaldo();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.erro || 'Não foi possível jogar Dice.');
    } finally {
      setLoading(false);
    }
  }

  async function jogarSlotsCommon(stake = 1) {
    setLoading(true);
    setError('');
    try {
      const { data } = await cassinoApi.slotsCommonPlay(stake);
      // backend retorna { mult, payout } — mostramos o multiplicador quando vier
      const mult = data.mult != null ? `x${data.mult}` : '—';
      alert(`Slots comum: prêmio ${mult} | payout: ${money(data.payout || 0)}`);
      await fetchSaldo();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.erro || 'Não foi possível jogar Slots comum.');
    } finally {
      setLoading(false);
    }
  }

  function sair() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('refresh_token');
    navigate('/', { replace: true });
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.sub}>
            Olá, <b>{firstName}</b>!
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button onClick={() => navigate('/admin')} style={styles.outBtn}>
              Admin
            </button>
          )}
          <button onClick={fetchSaldo} disabled={loading} style={styles.outBtn}>
            {loading ? 'Atualizando…' : 'Atualizar'}
          </button>
          <button onClick={sair} style={styles.outBtn}>
            Sair
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Saldo</h3>

          {error && <div style={styles.error}>{error}</div>}

          {!error && (
            <>
              {loading && !saldo && <div style={styles.info}>Carregando…</div>}

              {saldo && (
                <div style={styles.saldos}>
                  <div>
                    <span style={styles.k}>Disponível:</span> <b>{money(saldo.saldo_disponivel)}</b>
                  </div>
                  <div>
                    <span style={styles.k}>Bloqueado:</span> <b>{money(saldo.saldo_bloqueado)}</b>
                  </div>
                  <div>
                    <span style={styles.k}>Total:</span> <b>{money(saldo.saldo_total)}</b>
                  </div>
                </div>
              )}

              <div style={{ opacity: 0.7, marginTop: 6, fontSize: 12 }}>
                {lastAt ? `Atualizado às ${lastAt.toLocaleTimeString()}` : '—'}
              </div>
            </>
          )}

          <div style={styles.row}>
            <button onClick={() => depositar(10)} disabled={loading} style={styles.btn}>
              Depositar R$ 10
            </button>
            <button onClick={() => depositar(50)} disabled={loading} style={styles.btn}>
              Depositar R$ 50
            </button>
            <button onClick={() => depositar(100)} disabled={loading} style={styles.btn}>
              Depositar R$ 100
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Jogos rápidos</h3>
          <div style={styles.row}>
            <button onClick={() => jogarCoinflip(1, 'heads')} disabled={loading} style={styles.btn}>
              Coinflip R$1 em HEADS
            </button>
            <button onClick={() => jogarCoinflip(1, 'tails')} disabled={loading} style={styles.btn}>
              Coinflip R$1 em TAILS
            </button>
            <button onClick={() => jogarDice(1, 3)} disabled={loading} style={styles.btn}>
              Dice R$1 no 3
            </button>
            <button onClick={() => jogarSlotsCommon(1)} disabled={loading} style={styles.btn}>
              Slots (comum) R$1
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', background: '#0c0f14', color: '#eaecef' },
  header: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { margin: 0, fontSize: 26, lineHeight: 1.2 },
  sub: { margin: '8px 0 0', opacity: 0.8 },
  outBtn: {
    background: '#1f2937',
    color: '#eaecef',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  main: { maxWidth: 1100, margin: '0 auto', padding: '0 16px 40px' },
  card: {
    background: '#121722',
    border: '1px solid #1f2533',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: { marginTop: 0, marginBottom: 14, fontSize: 18 },
  row: { display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  btn: {
    background: '#2563eb',
    border: 0,
    color: '#fff',
    borderRadius: 8,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  info: {
    padding: '10px 12px',
    background: '#0f172a',
    borderRadius: 8,
    border: '1px solid #1e293b',
  },
  error: {
    padding: '10px 12px',
    background: '#2a0f10',
    borderRadius: 8,
    border: '1px solid #7f1d1d',
    color: '#fecaca',
  },
  saldos: { display: 'grid', gap: 6, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
  k: { opacity: 0.8, marginRight: 6 },
};
