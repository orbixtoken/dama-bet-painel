import { useEffect, useMemo, useState } from 'react';
import { sportsApi } from '../lib/api';

const Tabs = ({ tab, setTab }) => (
  <div className="flex gap-2 mb-4">
    {['events', 'markets', 'selections'].map((t) => (
      <button
        key={t}
        onClick={() => setTab(t)}
        className={`px-3 py-2 rounded-md text-sm border ${
          tab === t
            ? 'bg-blue-600 text-white border-blue-500'
            : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800'
        }`}
      >
        {t === 'events' ? 'Eventos' : t === 'markets' ? 'Mercados' : 'Seleções'}
      </button>
    ))}
  </div>
);

const Box = ({ children }) => (
  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 mb-6">
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    className={`bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 ${props.className || ''}`}
  />
);
const Select = (props) => (
  <select
    {...props}
    className={`bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 ${props.className || ''}`}
  />
);
const Btn = ({ tone = 'primary', className = '', ...rest }) => {
  const byTone = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border-0',
    ghost: 'bg-zinc-800 border border-zinc-700',
    danger: 'bg-red-600 hover:bg-red-500 text-white border-0',
  }[tone];
  return (
    <button
      {...rest}
      className={`px-3 py-2 rounded-md text-sm ${byTone} ${className}`}
    />
  );
};

export default function AdminSportsPage() {
  const [tab, setTab] = useState('events');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // Dados base para selects em cascata
  const [events, setEvents] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selections, setSelections] = useState([]);

  // Filtros
  const [eventFilter, setEventFilter] = useState('');
  const [marketFilter, setMarketFilter] = useState('');

  // Forms
  const emptyEvent = {
    league_code: '',
    home_name: '',
    away_name: '',
    start_time: '',
    status: 'scheduled',
  };
  const emptyMarket = {
    event_id: '',
    market_code: '',
    line: '',
    status: 'open',
  };
  const emptySelection = {
    market_id: '',
    name: '',
    odds: '',
    status: 'open',
  };

  const [evForm, setEvForm] = useState(emptyEvent);
  const [evEditing, setEvEditing] = useState(null);

  const [mkForm, setMkForm] = useState(emptyMarket);
  const [mkEditing, setMkEditing] = useState(null);

  const [selForm, setSelForm] = useState(emptySelection);
  const [selEditing, setSelEditing] = useState(null);

  // ========== LOADERS ==========
  async function loadEvents(params = {}) {
    const { data } = await sportsApi.listEvents(params);
    // o backend retorna {items, count}
    setEvents(data?.items || []);
  }
  async function loadMarkets(filter = {}) {
    const { data } = await sportsApi.listMarkets(filter);
    setMarkets(data?.items || []);
  }
  async function loadSelections(filter = {}) {
    const { data } = await sportsApi.listSelections(filter);
    setSelections(data?.items || []);
  }

  async function initialLoad() {
    setLoading(true); setErro('');
    try {
      await loadEvents({});
      if (eventFilter) await loadMarkets({ event_id: eventFilter });
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao carregar dados.');
    } finally { setLoading(false); }
  }

  useEffect(() => { initialLoad(); }, []);
  useEffect(() => {
    // quando muda filtro de evento, recarrega mercados e limpa seleções
    (async () => {
      try {
        setErro('');
        if (eventFilter) {
          await loadMarkets({ event_id: eventFilter });
        } else {
          setMarkets([]);
        }
        setMarketFilter('');
        setSelections([]);
      } catch (e) {
        setErro(e?.response?.data?.erro || 'Falha ao carregar mercados.');
      }
    })();
  }, [eventFilter]);

  useEffect(() => {
    // quando muda filtro de mercado, recarrega seleções
    (async () => {
      try {
        setErro('');
        if (marketFilter) {
          await loadSelections({ market_id: marketFilter });
        } else {
          setSelections([]);
        }
      } catch (e) {
        setErro(e?.response?.data?.erro || 'Falha ao carregar seleções.');
      }
    })();
  }, [marketFilter]);

  // ========== EVENTS ==========
  const submitEvent = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      if (evEditing) {
        await sportsApi.patchEvent(evEditing, {
          ...evForm,
          start_time: evForm.start_time, // ISO
        });
      } else {
        await sportsApi.createEvent(evForm);
      }
      setEvEditing(null);
      setEvForm(emptyEvent);
      await loadEvents({});
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Falha ao salvar evento.');
    }
  };
  const editEvent = (row) => {
    setEvEditing(row.id);
    setEvForm({
      league_code: row.league_code || '',
      home_name: row.home_name || '',
      away_name: row.away_name || '',
      start_time: row.start_time ? row.start_time.slice(0, 16) : '', // para input type=datetime-local
      status: row.status || 'scheduled',
    });
  };
  const removeEvent = async (id) => {
    if (!confirm('Remover evento?')) return;
    setErro('');
    try {
      await sportsApi.deleteEvent(id);
      // se estava filtrando por esse evento, limpa filtro
      if (String(eventFilter) === String(id)) {
        setEventFilter('');
        setMarkets([]);
        setSelections([]);
        setMarketFilter('');
      }
      await loadEvents({});
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao remover evento.');
    }
  };

  // ========== MARKETS ==========
  const submitMarket = async (e) => {
    e.preventDefault();
    if (!mkForm.event_id) return setErro('Selecione um evento antes.');
    setErro('');
    const payload = {
      event_id: Number(mkForm.event_id),
      market_code: mkForm.market_code.trim(),
      status: mkForm.status,
      line: mkForm.line === '' ? null : Number(mkForm.line),
    };
    try {
      if (mkEditing) {
        await sportsApi.patchMarket(mkEditing, payload);
      } else {
        await sportsApi.createMarket(payload);
      }
      setMkEditing(null);
      setMkForm({ ...emptyMarket, event_id: eventFilter || '' });
      await loadMarkets({ event_id: eventFilter });
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Falha ao salvar mercado.');
    }
  };
  const editMarket = (row) => {
    setMkEditing(row.id);
    setMkForm({
      event_id: row.event_id || '',
      market_code: row.market_code || '',
      line: row.line ?? '',
      status: row.status || 'open',
    });
    setEventFilter(String(row.event_id || ''));
  };
  const removeMarket = async (id) => {
    if (!confirm('Remover mercado?')) return;
    setErro('');
    try {
      await sportsApi.deleteMarket(id);
      if (String(marketFilter) === String(id)) {
        setMarketFilter('');
        setSelections([]);
      }
      await loadMarkets({ event_id: eventFilter });
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao remover mercado.');
    }
  };

  // ========== SELECTIONS ==========
  const submitSelection = async (e) => {
    e.preventDefault();
    if (!selForm.market_id) return setErro('Selecione um mercado antes.');
    setErro('');
    const payload = {
      market_id: Number(selForm.market_id),
      name: selForm.name.trim(),
      odds: Number(selForm.odds),
      status: selForm.status,
    };
    try {
      if (selEditing) {
        await sportsApi.patchSelection(selEditing, payload);
      } else {
        await sportsApi.createSelection(payload);
      }
      setSelEditing(null);
      setSelForm({ ...emptySelection, market_id: marketFilter || '' });
      await loadSelections({ market_id: marketFilter });
    } catch (err) {
      setErro(err?.response?.data?.erro || 'Falha ao salvar seleção.');
    }
  };
  const editSelection = (row) => {
    setSelEditing(row.id);
    setSelForm({
      market_id: row.market_id || '',
      name: row.name || '',
      odds: row.odds ?? '',
      status: row.status || 'open',
    });
    setMarketFilter(String(row.market_id || ''));
  };
  const removeSelection = async (id) => {
    if (!confirm('Remover seleção?')) return;
    setErro('');
    try {
      await sportsApi.deleteSelection(id);
      await loadSelections({ market_id: marketFilter });
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha ao remover seleção.');
    }
  };

  const settleSelection = async (selection_id, result) => {
    if (!['won', 'lost', 'void'].includes(result)) return;
    if (!confirm(`Liquidar TODAS as apostas pendentes dessa seleção como ${result.toUpperCase()}?`)) return;
    setErro('');
    try {
      await sportsApi.settleBySelection(Number(selection_id), result);
      alert('Liquidação enviada. Verifique saldos e apostas.');
    } catch (e) {
      setErro(e?.response?.data?.erro || 'Falha no settle.');
    }
  };

  const evName = (e) => `${e.home_name} x ${e.away_name} · ${new Date(e.start_time).toLocaleString()}`;
  const eventsById = useMemo(() => {
    const m = new Map();
    for (const e of events) m.set(String(e.id), e);
    return m;
  }, [events]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Esportes · Admin</h1>

      {erro && (
        <div className="rounded-md border border-red-700 bg-red-900/30 text-red-200 p-2 text-sm">
          {erro}
        </div>
      )}

      <Tabs tab={tab} setTab={setTab} />

      {/* ====== EVENTS ====== */}
      {tab === 'events' && (
        <>
          <Box>
            <h3 className="font-medium mb-3">{evEditing ? 'Editar evento' : 'Criar evento'}</h3>
            <form onSubmit={submitEvent} className="grid md:grid-cols-5 gap-3">
              <Input
                placeholder="league_code (ex: BRA_SERIEA)"
                value={evForm.league_code}
                onChange={(e) => setEvForm(f => ({ ...f, league_code: e.target.value }))}
                required
              />
              <Input
                placeholder="home_name"
                value={evForm.home_name}
                onChange={(e) => setEvForm(f => ({ ...f, home_name: e.target.value }))}
                required
              />
              <Input
                placeholder="away_name"
                value={evForm.away_name}
                onChange={(e) => setEvForm(f => ({ ...f, away_name: e.target.value }))}
                required
              />
              <Input
                type="datetime-local"
                value={evForm.start_time}
                onChange={(e) => setEvForm(f => ({ ...f, start_time: e.target.value }))}
                required
              />
              <Select
                value={evForm.status}
                onChange={(e) => setEvForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="scheduled">scheduled</option>
                <option value="open">open</option>
                <option value="closed">closed</option>
              </Select>

              <div className="md:col-span-5 flex gap-2">
                <Btn type="submit">{evEditing ? 'Atualizar' : 'Criar'}</Btn>
                {evEditing && (
                  <Btn
                    type="button"
                    tone="ghost"
                    onClick={() => { setEvEditing(null); setEvForm(emptyEvent); }}
                  >
                    Cancelar
                  </Btn>
                )}
              </div>
            </form>
          </Box>

          <Box>
            <div className="text-sm opacity-80 mb-3">
              {loading ? 'Carregando…' : `${events.length} evento(s)`}
            </div>
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="p-3 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{evName(e)}</div>
                    <div className="opacity-70">
                      {e.league_code} • status: {e.status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Btn tone="ghost" onClick={() => { setEventFilter(String(e.id)); }}>
                      Ver mercados
                    </Btn>
                    <Btn tone="ghost" onClick={() => editEvent(e)}>Editar</Btn>
                    <Btn tone="danger" onClick={() => removeEvent(e.id)}>Excluir</Btn>
                  </div>
                </div>
              ))}
              {!loading && events.length === 0 && (
                <div className="opacity-70 text-sm">Nenhum evento.</div>
              )}
            </div>
          </Box>
        </>
      )}

      {/* ====== MARKETS ====== */}
      {tab === 'markets' && (
        <>
          <Box>
            <div className="flex flex-col md:flex-row gap-3 md:items-end mb-3">
              <div className="flex-1">
                <label className="text-sm opacity-75">Filtrar por evento</label>
                <Select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="w-full">
                  <option value="">— selecione —</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{evName(e)}</option>
                  ))}
                </Select>
              </div>
            </div>

            <h3 className="font-medium mb-3">{mkEditing ? 'Editar mercado' : 'Criar mercado'}</h3>
            <form onSubmit={submitMarket} className="grid md:grid-cols-5 gap-3">
              <Select
                value={mkForm.event_id || eventFilter}
                onChange={(e) => setMkForm(f => ({ ...f, event_id: e.target.value }))}
              >
                <option value="">— evento —</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{evName(e)}</option>
                ))}
              </Select>
              <Input
                placeholder="market_code (ex: 1X2, OU, BTTS, HCP)"
                value={mkForm.market_code}
                onChange={(e) => setMkForm(f => ({ ...f, market_code: e.target.value }))}
                required
              />
              <Input
                type="number"
                placeholder="line (opcional)"
                value={mkForm.line}
                onChange={(e) => setMkForm(f => ({ ...f, line: e.target.value }))}
              />
              <Select
                value={mkForm.status}
                onChange={(e) => setMkForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="open">open</option>
                <option value="closed">closed</option>
              </Select>

              <div className="flex gap-2">
                <Btn type="submit">{mkEditing ? 'Atualizar' : 'Criar'}</Btn>
                {mkEditing && (
                  <Btn
                    type="button"
                    tone="ghost"
                    onClick={() => { setMkEditing(null); setMkForm({ ...emptyMarket, event_id: eventFilter || '' }); }}
                  >
                    Cancelar
                  </Btn>
                )}
              </div>
            </form>
          </Box>

          <Box>
            <div className="text-sm opacity-80 mb-3">
              {eventFilter ? `Mercados do evento #${eventFilter}` : 'Selecione um evento para listar mercados.'}
            </div>
            <div className="space-y-2">
              {markets.map((m) => (
                <div key={m.id} className="p-3 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{m.market_code} {m.line != null ? `(${m.line})` : ''}</div>
                    <div className="opacity-70">status: {m.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Btn tone="ghost" onClick={() => { setMarketFilter(String(m.id)); setTab('selections'); }}>
                      Seleções
                    </Btn>
                    <Btn tone="ghost" onClick={() => editMarket(m)}>Editar</Btn>
                    <Btn tone="danger" onClick={() => removeMarket(m.id)}>Excluir</Btn>
                  </div>
                </div>
              ))}
              {eventFilter && markets.length === 0 && (
                <div className="opacity-70 text-sm">Nenhum mercado para este evento.</div>
              )}
            </div>
          </Box>
        </>
      )}

      {/* ====== SELECTIONS ====== */}
      {tab === 'selections' && (
        <>
          <Box>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm opacity-75">Evento</label>
                <Select
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="w-full"
                >
                  <option value="">— selecione —</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{evName(e)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-sm opacity-75">Mercado</label>
                <Select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  className="w-full"
                  disabled={!eventFilter}
                >
                  <option value="">— selecione —</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      #{m.id} · {m.market_code}{m.line != null ? ` (${m.line})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <h3 className="font-medium mb-3">{selEditing ? 'Editar seleção' : 'Criar seleção'}</h3>
            <form onSubmit={submitSelection} className="grid md:grid-cols-5 gap-3">
              <Select
                value={selForm.market_id || marketFilter}
                onChange={(e) => setSelForm(f => ({ ...f, market_id: e.target.value }))}
              >
                <option value="">— mercado —</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    #{m.id} · {m.market_code}{m.line != null ? ` (${m.line})` : ''}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="name (ex: 1, X, 2)"
                value={selForm.name}
                onChange={(e) => setSelForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                type="number" step="0.01"
                placeholder="odds"
                value={selForm.odds}
                onChange={(e) => setSelForm(f => ({ ...f, odds: e.target.value }))}
                required
              />
              <Select
                value={selForm.status}
                onChange={(e) => setSelForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="open">open</option>
                <option value="closed">closed</option>
              </Select>

              <div className="flex gap-2">
                <Btn type="submit">{selEditing ? 'Atualizar' : 'Criar'}</Btn>
                {selEditing && (
                  <Btn
                    type="button"
                    tone="ghost"
                    onClick={() => { setSelEditing(null); setSelForm({ ...emptySelection, market_id: marketFilter || '' }); }}
                  >
                    Cancelar
                  </Btn>
                )}
              </div>
            </form>
          </Box>

          <Box>
            <div className="text-sm opacity-80 mb-3">
              {marketFilter ? `Seleções do mercado #${marketFilter}` : 'Selecione um mercado para listar seleções.'}
            </div>

            <div className="space-y-2">
              {selections.map((s) => (
                <div key={s.id} className="p-3 rounded-md border border-zinc-800 bg-zinc-950 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{s.name}</div>
                    <div className="opacity-70">odds: {Number(s.odds).toFixed(2)} • status: {s.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Btn tone="ghost" onClick={() => editSelection(s)}>Editar</Btn>
                    <Btn tone="danger" onClick={() => removeSelection(s.id)}>Excluir</Btn>

                    {/* Settle por seleção */}
                    <Select
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        settleSelection(s.id, val);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Settle…</option>
                      <option value="won">won</option>
                      <option value="lost">lost</option>
                      <option value="void">void</option>
                    </Select>
                  </div>
                </div>
              ))}
              {marketFilter && selections.length === 0 && (
                <div className="opacity-70 text-sm">Nenhuma seleção para este mercado.</div>
              )}
            </div>
          </Box>
        </>
      )}
    </div>
  );
}
