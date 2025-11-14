// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';

// URL opcional da logo (defina em .env: VITE_APP_LOGO_URL=/logo-cliente.png)
const BRAND_LOGO = import.meta.env.VITE_APP_LOGO_URL || null;

/* ================= helpers ================= */
const findJwtRec = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  const jwtLike = (s) =>
    typeof s === 'string' &&
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(s.trim());

  const direct =
    obj.access_token || obj.accessToken || obj.token || obj.jwt ||
    obj?.data?.access_token || obj?.data?.token || obj?.auth?.token || obj?.result?.token;
  if (jwtLike(direct)) return direct;

  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (jwtLike(v)) return v;
    if (v && typeof v === 'object') {
      const nested = findJwtRec(v);
      if (nested) return nested;
    }
  }
  return null;
};

const findUserRec = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = ['usuario', 'user', 'profile', 'account', 'data'];
  for (const k of candidates) {
    const v = obj[k];
    if (v && typeof v === 'object') {
      if ('id' in v && ('email' in v || 'usuario' in v || 'username' in v)) return v;
    }
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') {
      const nested = findUserRec(v);
      if (nested) return nested;
    }
  }
  return null;
};

/* ================= componente ================= */
export default function LoginPage() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setErro('');
    setLoading(true);
    try {
      const { data } = await authApi.login(usuario, senha);
      const token = data?.token || data?.access_token || findJwtRec(data);
      const user  = data?.usuario || data?.user || findUserRec(data) || {};
      if (!token) throw new Error('Não recebi o token do servidor.');

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(user || {}));
      if (data?.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);

      const role = String(user?.funcao || '').toUpperCase();
      navigate(role === 'ADMIN' || role === 'MASTER' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.erro ||
        err?.response?.data?.message ||
        err?.message ||
        'Usuário ou senha inválidos';
      setErro(msg);
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Título + logo opcional */}
        <div style={styles.titleRow}>
          {BRAND_LOGO && (
            <img
              src={BRAND_LOGO}
              alt="Logo"
              width={28}
              height={28}
              style={{ display: 'block', borderRadius: 6 }}
            />
          )}
          <h1 style={styles.title}>Entrar</h1>
        </div>

        {erro && <div style={styles.error}>{erro}</div>}

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>Usuário (ou e-mail)</label>
          <div style={styles.fieldWrap}>
            <input
              style={styles.fieldInput}
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="seu@email.com"
              autoFocus
              required
            />
          </div>

          <label style={{ ...styles.label, marginTop: 14 }}>Senha</label>
          <div style={styles.fieldWrap}>
            <input
              style={styles.fieldInput}
              type={showPass ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />

            {/* Botão do olho: GRANDE e centralizado */}
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              style={styles.eyeBtn}
              aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPass ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <span style={styles.eyeIcon} aria-hidden="true">
                {showPass ? '👁️' : '🙈'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !usuario || !senha}
            style={{ ...styles.submit, opacity: loading || !usuario || !senha ? 0.75 : 1 }}
          >
            {loading ? 'Acessando…' : 'Acessar'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ================= estilos ================= */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b0f14',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    background: '#111723',
    border: '1px solid #1e2433',
    borderRadius: 16,
    boxShadow: '0 16px 50px rgba(0,0,0,.45)',
    padding: '28px 26px',
    color: '#eaecef',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    margin: 0,
    letterSpacing: 0.3,
  },
  form: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, opacity: 0.85, marginBottom: 6 },

  fieldWrap: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    background: '#0e1420',
    border: '1px solid #2a3346',
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 64,     // espaço amplo para o botão
    height: 50,
    boxSizing: 'border-box',
  },
  fieldInput: {
    flex: 1,
    height: '100%',
    background: 'transparent',
    border: 'none',
    color: '#eaecef',
    outline: 'none',
    fontSize: 15,
    padding: '0 6px',
  },
  eyeBtn: {
    position: 'absolute',
    top: '50%',
    right: 8,
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#25324a',
    border: '1px solid #3b4a6b',
    borderRadius: 10,
    cursor: 'pointer',
    boxSizing: 'border-box',
    outline: 'none',
  },
  eyeIcon: {
    display: 'block',
    fontSize: 22,       // <<< GRANDE
    lineHeight: 1,      // sem recortes
    filter: 'drop-shadow(0 1px 0 rgba(0,0,0,.35))',
  },

  error: {
    marginBottom: 12,
    background: '#2a1010',
    border: '1px solid #7f1d1d',
    color: '#fecaca',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
  },
  submit: {
    marginTop: 18,
    background: '#4f5eff',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    borderRadius: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    width: '100%',
  },
};
