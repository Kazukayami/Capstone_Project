import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  Database,
  Filter,
  Gauge,
  Globe2,
  KeyRound,
  Layers3,
  Loader2,
  Map,
  MapPin,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from "lucide-react";
import "./styles.css";

const API_BASE = "http://localhost:4000/api/v1";
const defaultCredentials = {
  apiKey: "demo_key_123",
  apiSecret: "demo_secret_456"
};

function formatNumber(value) {
  if (value === null || value === undefined || value === "-") return "-";
  return new Intl.NumberFormat("en-IN").format(value);
}

function apiHeaders(credentials = defaultCredentials) {
  return {
    "Content-Type": "application/json",
    "x-api-key": credentials.apiKey,
    "x-api-secret": credentials.apiSecret
  };
}

async function getJson(path, credentials) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: apiHeaders(credentials)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || "Request failed");
  }

  return response.json();
}

function StatCard({ icon: Icon, label, value, caption, tone = "blue" }) {
  return (
    <section className={`stat-card tone-${tone}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{formatNumber(value)}</strong>
        {caption && <span>{caption}</span>}
      </div>
    </section>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <Sparkles size={22} />
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOverview() {
    try {
      setLoading(true);
      setError("");
      const result = await getJson("/admin/overview");
      setOverview(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const totals = overview?.totals || {};
  const topEndpoints = overview?.topEndpoints || [];
  const maxEndpointCount = Math.max(1, ...topEndpoints.map((endpoint) => endpoint._count.path));

  return (
    <div className="stack">
      <div className="workspace-hero">
        <div>
          <div className="eyebrow">
            <Globe2 size={16} />
            Production data platform
          </div>
          <h2>India Location Intelligence</h2>
          <p>Monitor dataset coverage, B2B API traffic, and client usage from one operating dashboard.</p>
        </div>
        <button onClick={loadOverview} disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="stats-grid">
        <StatCard icon={MapPin} label="States" value={totals.states} caption="Loaded from workbooks" tone="green" />
        <StatCard icon={Building2} label="Districts" value={totals.districts} caption="Normalized records" tone="blue" />
        <StatCard icon={Database} label="Villages" value={totals.villages} caption="Searchable API rows" tone="gold" />
        <StatCard icon={KeyRound} label="API Requests" value={totals.requests} caption={`${formatNumber(totals.clients ?? 0)} active client`} tone="violet" />
      </div>

      <div className="insight-grid">
        <section className="panel endpoint-panel">
          <div className="panel-title">
            <div>
              <h3>Endpoint Activity</h3>
              <p>Most requested API routes during local testing.</p>
            </div>
            <Gauge size={22} />
          </div>
          <div className="endpoint-bars">
            {topEndpoints.map((endpoint) => (
              <div className="endpoint-bar" key={endpoint.path}>
                <div className="endpoint-label">
                  <span>{endpoint.path}</span>
                  <strong>{endpoint._count.path}</strong>
                </div>
                <div className="bar-track">
                  <div style={{ width: `${(endpoint._count.path / maxEndpointCount) * 100}%` }} />
                </div>
              </div>
            ))}
            {!topEndpoints.length && <EmptyState title="No usage yet" message="Run a village search or API demo request to populate this chart." />}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h3>Recent Requests</h3>
              <p>Status, route, and client activity feed.</p>
            </div>
            <Activity size={22} />
          </div>
          <div className="request-feed">
            {(overview?.recentRequests || []).map((request) => (
              <article className="request-item" key={request.id}>
                <span className="method">{request.method}</span>
                <div>
                  <strong>{request.path}</strong>
                  <p>{request.apiClient?.name || "Client"} · {request.responseTime} ms</p>
                </div>
                <span className="status-pill">{request.statusCode}</span>
              </article>
            ))}
            {!overview?.recentRequests?.length && <EmptyState title="No requests" message="API usage logs appear here once clients call secured endpoints." />}
          </div>
        </section>
      </div>
    </div>
  );
}

function VillageExplorer() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subDistricts, setSubDistricts] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    pincode: "",
    stateId: "",
    districtId: "",
    subDistrictId: "",
    page: 1,
    limit: 25
  });
  const [villages, setVillages] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateFilter(name, value) {
    setFilters((current) => {
      const next = { ...current, [name]: value, page: 1 };
      if (name === "stateId") {
        next.districtId = "";
        next.subDistrictId = "";
      }
      if (name === "districtId") {
        next.subDistrictId = "";
      }
      return next;
    });
  }

  async function loadStates() {
    const result = await getJson("/locations/states");
    setStates(result.data);
  }

  async function loadDistricts(stateId) {
    if (!stateId) {
      setDistricts([]);
      return;
    }
    const result = await getJson(`/locations/districts${stateId ? `?stateId=${stateId}` : ""}`);
    setDistricts(result.data);
  }

  async function loadSubDistricts(districtId) {
    if (!districtId) {
      setSubDistricts([]);
      return;
    }
    const result = await getJson(`/locations/sub-districts?districtId=${districtId}`);
    setSubDistricts(result.data);
  }

  async function loadVillages(nextFilters = filters) {
    const params = new URLSearchParams({
      page: String(nextFilters.page),
      limit: String(nextFilters.limit)
    });

    ["search", "pincode", "stateId", "districtId", "subDistrictId"].forEach((key) => {
      if (nextFilters[key]) params.set(key, nextFilters[key]);
    });

    try {
      setLoading(true);
      setError("");
      const result = await getJson(`/locations/villages?${params.toString()}`);
      setVillages(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    loadVillages({ ...filters, page: 1 });
  }

  function changePage(page) {
    const next = { ...filters, page };
    setFilters(next);
    loadVillages(next);
  }

  function resetFilters() {
    const next = { search: "", pincode: "", stateId: "", districtId: "", subDistrictId: "", page: 1, limit: 25 };
    setFilters(next);
    setDistricts([]);
    setSubDistricts([]);
    loadVillages(next);
  }

  useEffect(() => {
    loadStates().catch((err) => setError(err.message));
    loadVillages();
  }, []);

  useEffect(() => {
    loadDistricts(filters.stateId).catch((err) => setError(err.message));
  }, [filters.stateId]);

  useEffect(() => {
    loadSubDistricts(filters.districtId).catch((err) => setError(err.message));
  }, [filters.districtId]);

  const selectedState = states.find((state) => String(state.id) === String(filters.stateId));
  const selectedDistrict = districts.find((district) => String(district.id) === String(filters.districtId));

  return (
    <div className="stack">
      <div className="section-header">
        <div>
          <div className="eyebrow">
            <Filter size={16} />
            Interactive search
          </div>
          <h2>Village Explorer</h2>
          <p>Drill from state to district to sub-district, then search across 6 lakh plus villages.</p>
        </div>
        <button className="secondary" onClick={resetFilters}>
          <RefreshCw size={16} />
          Reset
        </button>
      </div>

      <form className="filter-panel" onSubmit={submitSearch}>
        <label>
          State
          <select value={filters.stateId} onChange={(event) => updateFilter("stateId", event.target.value)}>
            <option value="">All states</option>
            {states.map((state) => (
              <option value={state.id} key={state.id}>{state.name}</option>
            ))}
          </select>
        </label>

        <label>
          District
          <select value={filters.districtId} onChange={(event) => updateFilter("districtId", event.target.value)} disabled={!filters.stateId}>
            <option value="">{filters.stateId ? "All districts" : "Select state first"}</option>
            {districts.map((district) => (
              <option value={district.id} key={district.id}>{district.name}</option>
            ))}
          </select>
        </label>

        <label>
          Sub-district
          <select value={filters.subDistrictId} onChange={(event) => updateFilter("subDistrictId", event.target.value)} disabled={!filters.districtId}>
            <option value="">{filters.districtId ? "All sub-districts" : "Select district first"}</option>
            {subDistricts.map((subDistrict) => (
              <option value={subDistrict.id} key={subDistrict.id}>{subDistrict.name}</option>
            ))}
          </select>
        </label>

        <label>
          Village name
          <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Example: Manibeli" />
        </label>

        <label>
          Pincode
          <input value={filters.pincode} onChange={(event) => updateFilter("pincode", event.target.value)} placeholder="Optional" />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
          Search
        </button>
      </form>

      <div className="breadcrumb-strip">
        <span>India</span>
        {selectedState && <><ChevronRight size={16} /><span>{selectedState.name}</span></>}
        {selectedDistrict && <><ChevronRight size={16} /><span>{selectedDistrict.name}</span></>}
        {filters.search && <><ChevronRight size={16} /><strong>{filters.search}</strong></>}
      </div>

      {error && <div className="alert">{error}</div>}

      <section className="panel results-panel">
        <div className="result-header">
          <div>
            <h3>Village Results</h3>
            <p>{meta ? `${formatNumber(meta.total)} matches · page ${meta.page} of ${formatNumber(meta.totalPages || 1)}` : "Loading location records"}</p>
          </div>
          <select value={filters.limit} onChange={(event) => {
            const next = { ...filters, limit: Number(event.target.value), page: 1 };
            setFilters(next);
            loadVillages(next);
          }}>
            <option value="10">10 rows</option>
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
            <option value="100">100 rows</option>
          </select>
        </div>

        <div className="village-grid">
          {villages.map((village) => (
            <article className="village-card" key={village.id}>
              <div className="village-pin">
                <MapPin size={18} />
              </div>
              <div className="village-main">
                <h4>{village.name}</h4>
                <p>{village.subDistrict.name}, {village.subDistrict.district.name}</p>
                <span>{village.subDistrict.district.state.name}</span>
              </div>
              <div className="village-meta">
                <span>Code {village.censusCode}</span>
                <span>{village.pincode || "No pincode"}</span>
              </div>
            </article>
          ))}
          {!villages.length && !loading && <EmptyState title="No villages found" message="Try a broader name, remove pincode, or reset filters." />}
        </div>

        <div className="pagination">
          <button className="secondary" onClick={() => changePage(Math.max(1, filters.page - 1))} disabled={loading || filters.page <= 1}>
            <ArrowLeft size={16} />
            Previous
          </button>
          <span>Page {formatNumber(filters.page)} of {formatNumber(meta?.totalPages || 1)}</span>
          <button className="secondary" onClick={() => changePage(Math.min(meta?.totalPages || 1, filters.page + 1))} disabled={loading || filters.page >= (meta?.totalPages || 1)}>
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

function DemoClient() {
  const [credentials, setCredentials] = useState(defaultCredentials);
  const [endpoint, setEndpoint] = useState("/locations/states");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("idle");

  const curl = useMemo(() => {
    return `curl -H "x-api-key: ${credentials.apiKey}" -H "x-api-secret: ${credentials.apiSecret}" http://localhost:4000/api/v1${endpoint}`;
  }, [credentials, endpoint]);

  async function sendRequest() {
    try {
      setStatus("loading");
      const result = await getJson(endpoint, credentials);
      setResponse(JSON.stringify(result, null, 2));
      setStatus("success");
    } catch (err) {
      setResponse(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="stack">
      <div className="section-header">
        <div>
          <div className="eyebrow">
            <TerminalSquare size={16} />
            B2B integration console
          </div>
          <h2>Demo Client</h2>
          <p>Test authenticated API calls exactly like a partner application would consume them.</p>
        </div>
        <div className={`status-chip ${status}`}>
          <ShieldCheck size={16} />
          {status === "idle" ? "Ready" : status}
        </div>
      </div>

      <section className="console-grid">
        <div className="panel client-form">
          <label>
            API key
            <input value={credentials.apiKey} onChange={(event) => setCredentials({ ...credentials, apiKey: event.target.value })} />
          </label>
          <label>
            API secret
            <input value={credentials.apiSecret} onChange={(event) => setCredentials({ ...credentials, apiSecret: event.target.value })} />
          </label>
          <label>
            Endpoint
            <select value={endpoint} onChange={(event) => setEndpoint(event.target.value)}>
              <option value="/locations/states">GET /locations/states</option>
              <option value="/locations/districts?stateId=24">GET /locations/districts?stateId=24</option>
              <option value="/locations/sub-districts?districtId=1">GET /locations/sub-districts?districtId=1</option>
              <option value="/locations/villages?search=Manibeli&limit=5">GET /locations/villages?search=Manibeli&limit=5</option>
            </select>
          </label>
          <button onClick={sendRequest} disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
            Send Request
          </button>
        </div>

        <section className="panel integration-card">
          <Map size={28} />
          <h3>API Contract</h3>
          <p>Every location endpoint requires `x-api-key` and `x-api-secret`. Usage is logged for admin analytics.</p>
          <div>
            <span>Rate limit</span>
            <strong>120 req/min</strong>
          </div>
        </section>
      </section>

      <section className="panel code-panel">
        <div className="panel-title">
          <h3>cURL Request</h3>
        </div>
        <pre>{curl}</pre>
      </section>

      <section className="panel code-panel response-panel">
        <div className="panel-title">
          <h3>Response</h3>
          <span className={`status-dot ${status}`} />
        </div>
        <pre>{response || "Send a request to see the API response."}</pre>
      </section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Gauge },
    { id: "villages", label: "Village Explorer", icon: Layers3 },
    { id: "client", label: "Demo Client", icon: TerminalSquare }
  ];

  return (
    <main>
      <aside className="sidebar">
        <div className="brand">
          <Database size={30} />
          <div>
            <h1>India Location API</h1>
            <p>Capstone Platform</p>
          </div>
        </div>

        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} key={item.id}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <KeyRound size={18} />
          <strong>Demo credentials</strong>
          <p>Use the seeded API key and secret to test secured endpoints.</p>
        </div>
      </aside>

      <section className="content">
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "villages" && <VillageExplorer />}
        {tab === "client" && <DemoClient />}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
