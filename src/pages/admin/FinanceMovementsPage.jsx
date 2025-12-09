// src/pages/admin/AdminMovementsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { adminFinanceApi } from "../../lib/api";
import "./admin-movements.css";

const fmtMoney = (v) =>
  (Number(v) < 0 ? "- " : "") +
  Math.abs(Number(v || 0)).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const fmtDate = (s) => (s ? new Date(s).toLocaleString() : "—");

function toIso(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Tipos que afetam o CAIXA da empresa:
const ENTRADA_TYPES = new Set(["deposito", "credito", "deposito_aprovado"]);
const SAIDA_TYPES = new Set(["pagamento_saque", "saque_pago", "saque"]);

export default function AdminMovementsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // KPIs de CAIXA
  const [kpi, setKpi] = useState({
    entradas: 0,
    saidas: 0,
    resultado: 0,
    saldoCaixa: 0,
  });
  const [loadingKpi, setLoadingKpi] = useState(false);

  // filtros ADM
  const [qUser, setQUser] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tipo, setTipo] = useState("");

  // paginação (servidor)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const pages = Math.max(
    1,
    Math.ceil(Number(total || 0) / Number(pageSize || 1))
  );

  // estado para limpar movimentos
  const [loadingClear, setLoadingClear] = useState(false);

  // --- tabela paginada ---
  async function loadTable() {
    setLoading(true);
    setErro("");
    try {
      const params = {
        q: qUser || undefined,
        tipo: tipo || undefined,
        from: toIso(from),
        to: toIso(to),
        page,
        pageSize,
      };
      const { data } = await adminFinanceApi.listMovimentos(params);

      const list = Array.isArray(data?.items) ? data.items : [];
      setTotal(Number(data?.total || list.length || 0));

      const mapped = list.map((r, idx) => ({
        id: r.id ?? idx,
        quando: r.created_at ?? r.criado_em ?? null,
        usuario:
          r.nome_usuario ||
          r.usuario ||
          r.login ||
          r.email ||
          r.usuario_id ||
          "—",
        tipo: String(r.tipo || "").toLowerCase(),
        descricao: r.descricao || "",
        antes: Number(r.saldo_antes ?? r.antes ?? 0),
        depois: Number(r.saldo_depois ?? r.depois ?? 0),
        valor: Number(r.valor ?? 0),
      }));

      setRows(mapped);
    } catch (e) {
      setErro(e?.response?.data?.erro || "Falha ao carregar movimentos.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // --- KPIs de caixa (sem paginação) ---
  async function loadKpis() {
    setLoadingKpi(true);
    try {
      // mesma filtragem, porém sem paginação para somar o período inteiro
      const params = {
        q: qUser || undefined,
        tipo: undefined, // KPIs consideram TODOS os tipos, mas filtramos por conjunto abaixo
        from: toIso(from),
        to: toIso(to),
        page: 1,
        pageSize: 10000, // suficiente para nosso volume atual
      };
      const { data } = await adminFinanceApi.listMovimentos(params);
      const list = Array.isArray(data?.items) ? data.items : [];

      let entradas = 0;
      let saidas = 0;

      for (const r of list) {
        const t = String(r.tipo || "").toLowerCase();
        const val = Number(r.valor ?? 0);
        const antes = Number(r.saldo_antes ?? r.antes ?? 0);
        const depois = Number(r.saldo_depois ?? r.depois ?? 0);
        const delta =
          Number.isFinite(antes) && Number.isFinite(depois) ? depois - antes : 0;

        if (ENTRADA_TYPES.has(t)) {
          // usa valor, senão cai no delta positivo
          entradas += Math.abs(val || (delta > 0 ? delta : 0));
        } else if (SAIDA_TYPES.has(t)) {
          saidas += Math.abs(val || (delta < 0 ? delta : 0));
        }
      }

      const resultado = entradas - saidas;
      const saldoCaixa = resultado; // quanto deveria ter em caixa no período filtrado

      setKpi({ entradas, saidas, resultado, saldoCaixa });
    } catch {
      setKpi({ entradas: 0, saidas: 0, resultado: 0, saldoCaixa: 0 });
    } finally {
      setLoadingKpi(false);
    }
  }

  // função para limpar efetivamente movimentos (chama backend)
  async function clearMovements() {
    // confirmação explícita — evitar clique acidental
    const anyFilter =
      (qUser && qUser.trim() !== "") ||
      (tipo && tipo.trim() !== "") ||
      (from && from.trim() !== "") ||
      (to && to.trim() !== "");
    const msg = anyFilter
      ? "Você tem certeza? Isso irá remover os movimentos filtrados permanentemente."
      : "Você tem certeza? Isso irá remover TODOS os movimentos permanentemente.";
    // usa confirm nativo — se tiver modal customizado, pode substituir
    if (!window.confirm(msg + "\n\nEsta ação não pode ser desfeita.")) return;

    setLoadingClear(true);
    setErro("");
    try {
      const payload = {
        q: qUser || undefined,
        tipo: tipo || undefined,
        from: toIso(from),
        to: toIso(to),
      };
      // chamamos o endpoint do admin para limpar movimentos.
      // Ajuste o nome do método se seu api usar outro (ex: deleteMovimentos).
      if (!adminFinanceApi.clearMovimentos) {
        throw new Error(
          "Método adminFinanceApi.clearMovimentos não encontrado. Ajuste o nome do método na API."
        );
      }
      await adminFinanceApi.clearMovimentos(payload);

      // sucesso — recarrega tudo e mostra feedback simples
      setErro("");
      await loadTable();
      await loadKpis();
      // se quiser, atualize total/rows forçadamente:
      setTotal(0);
      setRows([]);
      // mensagem de sucesso temporária (pode trocar por toast)
      setErro("Movimentações removidas com sucesso.");
      setTimeout(() => setErro(""), 3500);
    } catch (e) {
      setErro(
        e?.response?.data?.erro ||
          e?.message ||
          "Falha ao tentar limpar movimentos. Verifique logs do servidor."
      );
    } finally {
      setLoadingClear(false);
    }
  }

  // quando filtros mudam, volta para página 1 e recarrega tudo
  useEffect(() => {
    setPage(1);
  }, [qUser, from, to, tipo, pageSize]);

  useEffect(() => {
    loadTable();
    loadKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, qUser, from, to, tipo]);

  // KPIs visuais
  const kpiCards = useMemo(
    () => [
      { label: "Entradas (caixa)", value: fmtMoney(kpi.entradas), tone: "green" },
      { label: "Saídas (caixa)", value: fmtMoney(kpi.saidas), tone: "red" },
      {
        label: "Resultado (caixa)",
        value: fmtMoney(kpi.resultado),
        tone: kpi.resultado >= 0 ? "green" : "red",
      },
      { label: "Saldo em caixa*", value: fmtMoney(kpi.saldoCaixa), tone: "blue" },
    ],
    [kpi]
  );

  function clearFilters() {
    setQUser("");
    setTipo("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  return (
    <div className="am-wrap">
      <div className="am-head">
        <h1>Console Administrativo</h1>
        <div className="am-sub">Movimentações (Admin)</div>
      </div>

      {/* KPIs de caixa */}
      <div className="am-kpis">
        {kpiCards.map((c) => (
          <Kpi key={c.label} label={c.label} value={c.value} tone={c.tone} />
        ))}
      </div>
      <div className="am-note">
        * “Saldo em caixa” = Entradas − Saídas no intervalo/filtragem. Apostas não entram nesse cálculo.
        {loadingKpi && <span style={{ marginLeft: 6, opacity: 0.7 }}>Atualizando…</span>}
      </div>

      {/* Filtros */}
      <div className="am-filters">
        <input
          className="am-input"
          placeholder="Filtrar por usuário (nome/login)…"
          value={qUser}
          onChange={(e) => setQUser(e.target.value)}
        />
        <select
          className="am-input"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="">(Todos os tipos)</option>
          <option value="deposito">Depósito</option>
          <option value="saque">Saque</option>
          <option value="aposta">Aposta</option>
          <option value="pagamento_saque">Pagamento de saque</option>
        </select>
        <input
          className="am-input"
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="De"
        />
        <input
          className="am-input"
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="Até"
        />
        <button
          className="am-btn"
          onClick={() => {
            loadTable();
            loadKpis();
          }}
          disabled={loading || loadingKpi || loadingClear}
        >
          {loading || loadingKpi ? "Atualizando…" : "Atualizar"}
        </button>

        <button
          className="am-btn-ghost"
          onClick={clearFilters}
          disabled={loading || loadingKpi || loadingClear}
        >
          Limpar
        </button>

        {/* Botão de limpar movimentos (permanente) */}
        <button
          className="am-btn"
          onClick={clearMovements}
          disabled={loading || loadingKpi || loadingClear}
          style={{
            marginLeft: 8,
            background: loadingClear ? "linear-gradient(180deg,#facc15,#f97316)" : "linear-gradient(180deg,#ef4444,#dc2626)",
            border: "1px solid rgba(0,0,0,.12)",
            color: "#fff",
            fontWeight: 800,
          }}
          title="Remover movimentos (respeita filtros atuais). Ação irreversível."
        >
          {loadingClear ? "Limpando…" : "Limpar Movimentos"}
        </button>
      </div>

      {erro && <div className="am-error">{erro}</div>}

      {/* Tabela */}
      <div className="am-table-wrap">
        <table className="am-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Tipo</th>
              <th className="am-col-desc">Descrição</th>
              <th className="am-right">Δ (variação)</th>
              <th className="am-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="am-muted">Carregando…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="am-muted">Nenhuma movimentação encontrada.</td>
              </tr>
            ) : (
              rows.map((r) => {
                const delta = Number(r.depois) - Number(r.antes);
                return (
                  <tr key={r.id}>
                    <td className="am-nowrap">{fmtDate(r.quando)}</td>
                    <td>{r.usuario}</td>
                    <td><TipoChip tipo={r.tipo} /></td>
                    <td className="am-col-desc">{r.descricao || "—"}</td>
                    <td className={`am-right ${delta >= 0 ? "am-pos" : "am-neg"}`}>
                      {fmtMoney(delta)}
                    </td>
                    <td className="am-right am-mono">{fmtMoney(r.depois)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação (server) */}
      <div className="am-pager">
        <div> Total: {total} • Página {page} / {pages}</div>
        <div className="am-pager-actions">
          <button
            className="am-btn-ghost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <select
            className="am-input"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) || 25);
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}/página</option>
            ))}
          </select>
          <button
            className="am-btn-ghost"
            disabled={page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = "blue" }) {
  return (
    <div className={`am-kpi am-${tone}`}>
      <div className="am-kpi-label">{label}</div>
      <div className="am-kpi-value">{value}</div>
    </div>
  );
}

function TipoChip({ tipo }) {
  const t = String(tipo || "").toLowerCase();
  const map = {
    deposito: { bg: "#0f2a1d", bd: "#14532d", fg: "#86efac", txt: "depósito" },
    credito: { bg: "#0f2a1d", bd: "#14532d", fg: "#86efac", txt: "crédito" },
    saque: { bg: "#22111f", bd: "#a21caf", fg: "#f0abfc", txt: "saque" },
    pagamento_saque: { bg: "#211e0e", bd: "#a16207", fg: "#facc15", txt: "pagto saque" },
    aposta: { bg: "#2a0f10", bd: "#7f1d1d", fg: "#fca5a5", txt: "aposta" },
  };
  const s = map[t] || { bg: "#141923", bd: "#334155", fg: "#cbd5e1", txt: t || "—" };
  return (
    <span className="am-chip" style={{ background: s.bg, borderColor: s.bd, color: s.fg }} title={t}>
      {s.txt}
    </span>
  );
}
