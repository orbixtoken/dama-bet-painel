// painel/src/pages/admin/DepositosPage.jsx
import React, { useEffect, useState } from "react";
import { adminDepositsApi } from "../../lib/api";

export default function DepositosPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pendente");
  const [usuarioId, setUsuarioId] = useState("");
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState("");     // yyyy-mm-dd
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminDepositsApi.list({
        status: status || undefined,
        usuario_id: usuarioId || undefined,
        from: from || undefined,
        to: to || undefined,
        pageSize: 50,
      });
      // backend novo retorna { page, pageSize, total, items }
      // legados podem retornar array
      setItems(Array.isArray(data) ? data : (data?.items || data?.rows || []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setDepositStatus(id, novoStatus) {
    if (!id) return;
    let motivo;
    if (novoStatus === "aprovado") {
      const ok = window.confirm("Confirmar APROVAÇÃO deste depósito? O valor será creditado ao usuário.");
      if (!ok) return;
    }
    if (novoStatus === "recusado") {
      motivo = window.prompt("Motivo da recusa (opcional):") ?? "";
      const ok = window.confirm("Confirmar RECUSA deste depósito?");
      if (!ok) return;
    }
    await adminDepositsApi.patchStatus(id, novoStatus, motivo);
    await load();
    alert(novoStatus === "aprovado" ? "Depósito aprovado e creditado." : "Depósito recusado.");
  }

  const fmtDate = (v) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d.toLocaleString() : "-";
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Depósitos (Admin)</h2>

      {/* Filtros */}
      <div className="grid md:grid-cols-5 gap-2 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg bg-black/30 border border-white/10 px-3 py-2"
        >
          <option value="">todos</option>
          <option value="pendente">pendente</option>
          <option value="aprovado">aprovado</option>
          <option value="recusado">recusado</option>
        </select>

        <input
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          placeholder="usuario_id"
          className="rounded-lg bg-black/30 border border-white/10 px-3 py-2"
        />

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg bg-black/30 border border-white/10 px-3 py-2"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg bg-black/30 border border-white/10 px-3 py-2"
        />

        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg bg-white/10 px-3 py-2">
            Aplicar filtros
          </button>
          <button
            onClick={() => {
              setStatus("pendente");
              setUsuarioId("");
              setFrom("");
              setTo("");
              load();
            }}
            className="rounded-lg bg-white/10 px-3 py-2"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-3 py-2">Usuário</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Código ref</th>
              <th className="px-3 py-2">Chave PIX</th>
              <th className="px-3 py-2">Criado</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3" colSpan={7}>Carregando…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-3" colSpan={7}>Nenhum depósito encontrado.</td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    {d.nome_usuario || d.login || d.usuario_id}
                  </td>
                  <td className="px-3 py-2">R$ {Number(d.valor).toFixed(2)}</td>
                  <td className="px-3 py-2">{d.status}</td>
                  <td className="px-3 py-2"><code>{d.codigo_ref}</code></td>
                  <td className="px-3 py-2">{d.pix_chave || "-"}</td>
                  <td className="px-3 py-2">{fmtDate(d.created_at || d.criado_em)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={d.status !== "pendente"}
                        onClick={() => setDepositStatus(d.id, "aprovado")}
                        className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-xs disabled:opacity-40"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => setDepositStatus(d.id, "recusado")}
                        className="rounded bg-rose-600 hover:bg-rose-500 px-3 py-1 text-xs"
                      >
                        Recusar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
