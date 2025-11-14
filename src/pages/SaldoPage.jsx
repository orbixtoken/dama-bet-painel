// src/pages/SaldoPage.jsx
import { useEffect, useRef, useState } from 'react';
import { financeiroApi } from '../lib/api';

const money = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(Number(n || 0));

const fmtDt = (v) => (v ? new Date(v).toLocaleString() : '—');

export default function SaldoPage() {
  const [saldo, setSaldo] = useState(null);
  const [movs, setMovs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [lastAt, setLastAt] = useState(null);
  const inFlight = useRef(false);

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setErr('');
    try {
      const s = await financeiroApi.saldo();
      setSaldo(s.data);
      const m = await financeiroApi.movimentos();
      setMovs(Array.isArray(m.data) ? m.data : []);
      setLastAt(new Date());
    } catch (e) {
      setErr(e?.response?.data?.erro || 'Falha ao carregar saldo e movimentos.');
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16, color: '#eaecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Meu Saldo</h1>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: '#1f2937', color: '#eaecef', border: '1px solid #374151',
            borderRadius: 8, padding: '8px 12px', cursor: 'pointer', opacity: loading ? 0.75 : 1
          }}
        >
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {err && (
        <div
          style={{
            padding: '10px 12px', background: '#2a1010', border: '1px solid #7f1d1d',
            color: '#fecaca', borderRadius: 10, marginBottom: 12
          }}
        >
          {err}
        </div>
      )}

      <section
        style={{
          background: '#121722', border: '1px solid #1f2533', borderRadius: 12, padding: 16, marginBottom: 16
        }}
      >
        {!saldo ? (
          <div style={{ opacity: 0.85 }}>Carregando…</div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
                marginBottom: 8
              }}
            >
              <Stat label="Disponível" value={money(saldo.saldo_disponivel)} />
              <Stat label="Bloqueado" value={money(saldo.saldo_bloqueado)} />
              <Stat label="Total" value={money(saldo.saldo_total)} />
            </div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              {lastAt ? `Atualizado às ${lastAt.toLocaleTimeString()}` : '—'}
            </div>
          </>
        )}
      </section>

      <section
        style={{
          background: '#121722', border: '1px solid #1f2533', borderRadius: 12, padding: 0
        }}
      >
        <div style={{ padding: 14, borderBottom: '1px solid #1f2533', fontWeight: 600 }}>
          Movimentos
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0f1420' }}>
                <Th>Data</Th>
                <Th>Tipo</Th>
                <Th style={{ textAlign: 'right' }}>Valor</Th>
                <Th>Descrição</Th>
                <Th style={{ textAlign: 'right' }}>Saldo antes</Th>
                <Th style={{ textAlign: 'right' }}>Saldo depois</Th>
              </tr>
            </thead>
            <tbody>
              {loading && movs.length === 0 && (
                <tr><Td colSpan={6}>Carregando…</Td></tr>
              )}
              {!loading && movs.length === 0 && (
                <tr><Td colSpan={6} style={{ opacity: 0.75 }}>Nenhum movimento.</Td></tr>
              )}
              {movs.map((m, i) => (
                <tr key={m.id ?? i} style={{ borderTop: '1px solid #1f2533' }}>
                  <Td>{fmtDt(m.criado_em)}</Td>
                  <Td><Badge tipo={m.tipo} /></Td>
                  <Td style={{ textAlign: 'right' }}>{money(m.valor)}</Td>
                  <Td>{m.descricao || '—'}</Td>
                  <Td style={{ textAlign: 'right' }}>{money(m.saldo_antes)}</Td>
                  <Td style={{ textAlign: 'right' }}>{money(m.saldo_depois)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div
      style={{
        background: '#0f1420', border: '1px solid #1f2533', borderRadius: 10, padding: 12
      }}
    >
      <div style={{ opacity: 0.75, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Badge({ tipo }) {
  const pretty =
    { deposito: 'Depósito', aposta: 'Aposta', credito: 'Crédito', saque: 'Saque' }[tipo] || tipo || '—';
  const isNeg = tipo === 'aposta' || tipo === 'saque';
  const bg = isNeg ? '#3f1a1a' : '#102a1a';
  const br = isNeg ? '#7f1d1d' : '#1d7f3a';
  const color = isNeg ? '#fecaca' : '#c7f9cc';
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        background: bg,
        border: `1px solid ${br}`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {pretty}
    </span>
  );
}

function Th(props) {
  return (
    <th
      {...props}
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        fontWeight: 600,
        borderBottom: '1px solid #1f2533',
        ...(props.style || {}),
      }}
    />
  );
}

function Td(props) {
  return (
    <td
      {...props}
      style={{
        padding: '10px 12px',
        ...(props.style || {}),
      }}
    />
  );
}
