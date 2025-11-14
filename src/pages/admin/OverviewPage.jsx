// src/pages/admin/OverviewPage.jsx
import { Link } from 'react-router-dom';

const card = {
  background: '#121722',
  border: '1px solid #1f2533',
  borderRadius: 12,
  padding: 16,
};
const btn = {
  background: '#2563eb',
  border: 0,
  color: '#fff',
  borderRadius: 8,
  padding: '8px 12px',
  textDecoration: 'none',
};

export default function OverviewPage() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Atalhos rápidos – só Cassino */}
      <section style={card}>
        <h2 style={{ marginTop: 0 }}>Atalhos rápidos</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/admin/casino/games" style={btn}>
            Cassino • Config Jogos
          </Link>
        </div>
      </section>

      {/* Status */}
      <section style={card}>
        <h3 style={{ marginTop: 0 }}>Status</h3>
        <div style={{ opacity: 0.8, fontSize: 14 }}>
          <div>• APIs do cassino ativas (ambiente local)</div>
          <div>• Use as opções da barra lateral para navegar</div>
        </div>
      </section>
    </div>
  );
}
