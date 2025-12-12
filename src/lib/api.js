// src/lib/api.js
import axios from 'axios';

/**
 * Em DEV:
 *  - BASE = window.location.origin (ex.: http://localhost:5173)
 *  - O Vite faz proxy de /api -> backend (configurado no vite.config.js)
 *
 * Em PROD (build):
 *  - BASE = VITE_API_BASE (ex.: https://dama-bet-backend.onrender.com)
 */
const isDev = import.meta.env.DEV;
const DEV_BASE = window.location.origin;

const PROD_BASE = (
  import.meta.env.VITE_API_BASE || 'https://dama-bet-backend.onrender.com'
).replace(/\/$/, '');

const BASE = isDev ? DEV_BASE : PROD_BASE;
const PREFIX = import.meta.env.VITE_API_PREFIX || '/api';

/* ------------------------- Axios base ------------------------- */
export const http = axios.create({
  baseURL: BASE,
  withCredentials: false,
  timeout: 15000,
});

function getToken() {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    null
  );
}
//lua
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('usuario');
}

http.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

/* ---------------------- Auto refresh 401 ---------------------- */
let refreshing = null;

async function doRefresh() {
  if (!refreshing) {
    const refresh_token = localStorage.getItem('refresh_token');
    refreshing = (async () => {
      if (!refresh_token) throw new Error('No refresh token');
      const { data } = await http.post(`${PREFIX}/auth/refresh`, { refresh_token });
      const accessToken =
        data?.access_token || data?.token || data?.data?.access_token || null;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('access_token', accessToken);
      }
      return accessToken;
    })().finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  }
  return refreshing;
}

http.interceptors.response.use(
  (r) => r,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config;

    // tenta refresh uma vez
    if (status === 401 && original && !original._retry) {
      try {
        original._retry = true;
        await doRefresh();
        const t = getToken();
        if (t) {
          original.headers = { ...(original.headers || {}), Authorization: `Bearer ${t}` };
        }
        return http.request(original);
      } catch {
        clearAuth();
        if (location.pathname !== '/') location.replace('/');
      }
    }

    // sessão inválida
    if ([403, 419, 498].includes(status)) {
      clearAuth();
      if (location.pathname !== '/') location.replace('/');
    }

    return Promise.reject(err);
  }
);

/* ---------------------- Helper genérico ----------------------- */
async function requestWithFallback(method, paths, config = {}) {
  let lastError;
  for (const p of paths) {
    try {
      if (method === 'get') return await http.get(`${PREFIX}${p}`, config);
      if (method === 'post') return await http.post(`${PREFIX}${p}`, config?.data ?? config);
      if (method === 'put') return await http.put(`${PREFIX}${p}`, config?.data ?? config);
      if (method === 'patch') return await http.patch(`${PREFIX}${p}`, config?.data ?? config);
      if (method === 'delete') return await http.delete(`${PREFIX}${p}`, config);
      throw new Error(`Método não suportado: ${method}`);
    } catch (e) {
      lastError = e;
      const st = e?.response?.status;
      if (![404, 405].includes(st)) break;
    }
  }
  throw lastError;
}

/* ------------------------- AUTH ------------------------- */
export const authApi = {
  login: (usuario, senha) => http.post(`${PREFIX}/auth/login`, { usuario, senha }),
  refresh: (refresh_token) => http.post(`${PREFIX}/auth/refresh`, { refresh_token }),
  me: () => http.get(`${PREFIX}/usuarios/me`),
};

/* --------------- Admin: Depósitos (novo console) --------------- */
export const adminDepositsApi = {
  list: (params) => http.get(`${PREFIX}/admin/depositos`, { params }),
  patchStatus: (id, status, motivo) =>
    http.patch(`${PREFIX}/admin/depositos/${id}/status`, { status, motivo }),
};

/* ------------------ Admin: Saques / Usuários ------------------- */
export const adminWithdrawalsApi = {
  list: (params) => http.get(`${PREFIX}/admin/saques`, { params }),
  // rota correta (sem /admin) e campo 'motivo_recusa' quando recusado
  patchStatus: (id, status, motivo) => {
    const body =
      String(status) === 'recusado'
        ? { status, motivo_recusa: motivo }
        : { status };
    return http.patch(`${PREFIX}/saques/${id}/status`, body);
  },
};

export const adminUsersApi = {
  list: (params) => http.get(`${PREFIX}/admin/usuarios`, { params }),
  block: (id, motivo) => http.patch(`${PREFIX}/admin/usuarios/${id}/bloquear`, { motivo }),
  unblock: (id) => http.patch(`${PREFIX}/admin/usuarios/${id}/desbloquear`),
  movimentos: (usuarioId, params) =>
    http.get(`${PREFIX}/admin/usuarios/${usuarioId}/movimentos`, { params }),
};

/* ----------------- Admin: Financeiro (Geral) ------------------- */
/* ----------------- Admin: Financeiro (Geral) ------------------- */
export const adminFinanceApi = {
  listMovimentos: (params = {}) =>
    http.get(`${PREFIX}/admin/financeiro/movimentos`, { params }),

  // novo: limpar movimentos (POST com filtros)
  clearMovimentos: (filters = {}) =>
    http.post(`${PREFIX}/admin/financeiro/movimentos/clear`, filters),
};


/* ---------------- FINANCEIRO (usuário/site) ----------------- */
export const financeiroApi = {
  // Saldo
  saldo: () => requestWithFallback('get', ['/financeiro/saldo', '/saldo']),
  // Movimentos
  movimentos: (params = {}) =>
    requestWithFallback('get', ['/financeiro/movimentos'], { params }).catch(() =>
      http.get(`${PREFIX}/movimentos`, { params })
    ),
  // Depositar (ticket PIX)
  depositar: (valorOuObj, descricao) => {
    let payload;
    if (typeof valorOuObj === 'object' && valorOuObj !== null) {
      const { valor, metodo = 'PIX', referencia = '' } = valorOuObj;
      payload = { valor, metodo, referencia };
    } else {
      payload = { valor: valorOuObj, metodo: 'PIX', referencia: descricao ?? '' };
    }
    return requestWithFallback('post', ['/depositos', '/financeiro/deposito'], payload);
  },
  createDeposit: (payload) => financeiroApi.depositar(payload),
  // Saque
  withdraw: ({ valor, chave_pix }) => {
    const payload = { valor, pix_chave: String(chave_pix ?? '').trim() };
    return http.post(`${PREFIX}/saques`, payload);
  },
};

// aliases antigos
export { financeiroApi as financeiroSiteApi };
export { adminFinanceApi as adminApi };

/* ------------------- CASSINO (player) ------------------- */
export const cassinoApi = {
  coinflipPlay: (stake, bet) => http.post(`${PREFIX}/cassino/coinflip/play`, { stake, bet }),
  dicePlay: (stake, target) => http.post(`${PREFIX}/cassino/dice/play`, { stake, target }),
  hiloPlay: (stake, choice) => http.post(`${PREFIX}/cassino/hilo/play`, { stake, choice }),
  scratchPlay: (stake) => http.post(`${PREFIX}/cassino/scratch/play`, { stake }),
  slotsCommonPlay: (stake) => http.post(`${PREFIX}/cassino/slots/common/play`, { stake }),
  slotsPremiumPlay: (stake) => http.post(`${PREFIX}/cassino/slots/premium/play`, { stake }),

  minhasCoinflip: () => http.get(`${PREFIX}/cassino/coinflip/minhas`),
  minhasDice: () => http.get(`${PREFIX}/cassino/dice/minhas`),
  minhasHiLo: () => http.get(`${PREFIX}/cassino/hilo/minhas`),
  minhasScratch: () => http.get(`${PREFIX}/cassino/scratch/minhas`),
  minhasSlotsCommon: () => http.get(`${PREFIX}/cassino/slots/common/minhas`),
  minhasSlotsPremium: () => http.get(`${PREFIX}/cassino/slots/premium/minhas`),
};
export const casinoApi = cassinoApi;

/* -------- CASSINO (admin games-config) -------- */
export const casinoAdminApi = {
  list: () => http.get(`${PREFIX}/cassino/games-config`),
  getOne: (slug) => http.get(`${PREFIX}/cassino/games-config/${slug}`),
  upsert: (slug, payload) => http.put(`${PREFIX}/cassino/games-config/${slug}`, payload),
  patch: (slug, payload) => http.patch(`${PREFIX}/cassino/games-config/${slug}`, payload),
  deactivate: (slug) => http.delete(`${PREFIX}/cassino/games-config/${slug}`),
};

/* -------------- Esportes (opcional) --------------- */
export const sportsApi = {
  price: (probs, league_code, market_code) =>
    http.post(`${PREFIX}/sports/price`, { probs, league_code, market_code }),
  upcoming: (params) => http.get(`${PREFIX}/sports/events/upcoming`, { params }),

  listEvents: (query) => http.get(`${PREFIX}/admin/sports/events`, { params: query }),
  createEvent: (data) => http.post(`${PREFIX}/admin/sports/events`, data),
  patchEvent: (id, data) => http.patch(`${PREFIX}/admin/sports/events/${id}`, data),
  deleteEvent: (id) => http.delete(`${PREFIX}/admin/sports/events/${id}`),

  listMarkets: (q) => http.get(`${PREFIX}/admin/sports/markets`, { params: q }),
  createMarket: (d) => http.post(`${PREFIX}/admin/sports/markets`, d),
  patchMarket: (id, d) => http.patch(`${PREFIX}/admin/sports/markets/${id}`, d),
  deleteMarket: (id) => http.delete(`${PREFIX}/admin/sports/markets/${id}`),

  listSelections: (q) => http.get(`${PREFIX}/admin/sports/selections`, { params: q }),
  createSelection: (d) => http.post(`${PREFIX}/admin/sports/selections`, d),
  patchSelection: (id, d) => http.patch(`${PREFIX}/admin/sports/selections/${id}`, d),
  deleteSelection: (id) => http.delete(`${PREFIX}/admin/sports/selections/${id}`),

  settleBySelection: (selection_id, result) =>
    http.post(`${PREFIX}/admin/sports/settle-by-selection`, { selection_id, result }),

  listMargins: () => http.get(`${PREFIX}/sports/margins`),
  upsertMargins: (items) => http.put(`${PREFIX}/sports/margins`, items),
  patchMargin: (id, payload) => http.patch(`${PREFIX}/sports/margins/${id}`, payload),
  removeMargin: (id) => http.delete(`${PREFIX}/sports/margins/${id}`),
};

export default http;
