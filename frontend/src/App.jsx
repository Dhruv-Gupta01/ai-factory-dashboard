import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useMetrics } from "./hooks/useMetrics";
import {
  getFactoryMetrics, getWorkerMetrics, getWorkstationMetrics,
  getWorkerDetail, getWorkstationDetail, reseedData,
} from "./api";
import {
  LiveDot, KpiCard, TrendChart, Tabs, SectionHeader,
  formatMinutes, formatNumber,
} from "./components/Primitives";
import WorkerTable from "./components/WorkerTable";
import WorkstationTable from "./components/WorkstationTable";
import DetailPanel from "./components/DetailPanel";

// ── Theme state ────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState("light");
  const [accent, setAccent] = useState("oxide");
  const [serifNumerals, setSerif] = useState(true);
  const [denseTables, setDense] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme  = theme;
    root.dataset.accent = accent;
    root.dataset.serif  = serifNumerals ? "1" : "0";
    root.dataset.dense  = denseTables   ? "1" : "0";
  }, [theme, accent, serifNumerals, denseTables]);

  return { theme, setTheme, accent, setAccent, serifNumerals, setSerif, denseTables, setDense };
}

// ── Live clock ─────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Theme toggle ───────────────────────────────────────────────────────
function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
      <span className={`theme-toggle-track theme-toggle-${theme}`}>
        <span className="theme-toggle-knob">
          {theme === "light" ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}

// ── Tweaks panel ───────────────────────────────────────────────────────
const ACCENT_MAP = {
  "#3a6f4d": "oxide",
  "#b8732a": "amber",
  "#3a4a5e": "iron",
  "#8a3a3a": "claret",
};
const ACCENT_COLORS = Object.keys(ACCENT_MAP);

function TweaksPanel({ theme, setTheme, accent, setAccent, serifNumerals, setSerif, denseTables, setDense }) {
  const [open, setOpen] = useState(false);
  const currentColor = Object.entries(ACCENT_MAP).find(([, v]) => v === accent)?.[0] || "#3a6f4d";

  return (
    <>
      {open && (
        <div className="tweaks-drawer">
          <div className="tweaks-drawer-title">Tweaks</div>
          <div className="tweak-row">
            <span className="tweak-label">Theme</span>
            <div className="tweak-toggle-wrap">
              {["light", "dark"].map((v) => (
                <button key={v} className={`tweak-opt ${theme === v ? "active" : ""}`} onClick={() => setTheme(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="tweak-row">
            <span className="tweak-label">Accent</span>
            <div className="tweak-swatch-wrap">
              {ACCENT_COLORS.map((color) => (
                <span
                  key={color}
                  className={`tweak-swatch ${currentColor === color ? "active" : ""}`}
                  style={{ background: color }}
                  onClick={() => setAccent(ACCENT_MAP[color])}
                />
              ))}
            </div>
          </div>
          <div className="tweak-row">
            <span className="tweak-label">Serif numerals</span>
            <div className={`tweak-check ${serifNumerals ? "on" : ""}`} onClick={() => setSerif(!serifNumerals)} />
          </div>
          <div className="tweak-row">
            <span className="tweak-label">Dense tables</span>
            <div className={`tweak-check ${denseTables ? "on" : ""}`} onClick={() => setDense(!denseTables)} />
          </div>
        </div>
      )}
      <button className="tweaks-fab" onClick={() => setOpen((o) => !o)} aria-label="Tweaks">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
      </button>
    </>
  );
}

// ── Header ─────────────────────────────────────────────────────────────
function Header({ dateFilter, setDateFilter, search, setSearch, theme, onToggleTheme, onReseed, seeding }) {
  const clock = useClock();
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <rect x="2"  y="14" width="4" height="8"  fill="currentColor"/>
              <rect x="8"  y="8"  width="4" height="14" fill="currentColor"/>
              <rect x="14" y="2"  width="4" height="20" fill="currentColor"/>
              <rect x="20" y="10" width="2" height="12" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">AI FACTORY</div>
            <div className="brand-sub mono">Productivity OS</div>
          </div>
        </div>

        <div className="header-status">
          <span className="status-pill"><LiveDot /><span style={{ marginLeft: 6 }}>Live</span></span>
          <span className="dim mono small">Auto-refresh 30s · {clock}</span>
        </div>

        <div className="header-tools">
          <div className="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workers, stations…"
              className="search-input"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-input"
          />
          {dateFilter && (
            <button className="btn-ghost" onClick={() => setDateFilter("")}>Clear</button>
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="btn-primary" onClick={onReseed} disabled={seeding}>
            {seeding ? "Reseeding…" : "Reseed"}
          </button>
        </div>
      </div>
    </header>
  );
}

// ── App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { theme, setTheme, accent, setAccent, serifNumerals, setSerif, denseTables, setDense } = useTheme();

  const [tab, setTab] = useState("workers");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [seeding, setSeeding] = useState(false);

  const factory     = useMetrics(() => getFactoryMetrics(dateFilter),     [dateFilter]);
  const workers     = useMetrics(() => getWorkerMetrics(dateFilter),      [dateFilter]);
  const workstations = useMetrics(() => getWorkstationMetrics(dateFilter), [dateFilter]);

  const filteredWorkers = useMemo(() => {
    if (!workers.data) return [];
    if (!search) return workers.data;
    const q = search.toLowerCase();
    return workers.data.filter((w) =>
      w.name.toLowerCase().includes(q) ||
      w.worker_id.toLowerCase().includes(q) ||
      w.workstation_id.toLowerCase().includes(q)
    );
  }, [search, workers.data]);

  const filteredStations = useMemo(() => {
    if (!workstations.data) return [];
    if (!search) return workstations.data;
    const q = search.toLowerCase();
    return workstations.data.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.station_id.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q)
    );
  }, [search, workstations.data]);

  const handleSelectWorker = useCallback(async (w) => {
    const detail = await getWorkerDetail(w.worker_id, dateFilter);
    setSelected({ entity: detail, type: "worker" });
  }, [dateFilter]);

  const handleSelectStation = useCallback(async (s) => {
    const detail = await getWorkstationDetail(s.station_id, dateFilter);
    setSelected({ entity: detail, type: "workstation" });
  }, [dateFilter]);

  const handleClose = () => setSelected(null);

  const handleReseed = async () => {
    setSeeding(true);
    try {
      await reseedData(7);
      factory.refresh();
      workers.refresh();
      workstations.refresh();
      setSelected(null);
    } finally {
      setSeeding(false);
    }
  };

  const F = factory.data;
  const dailyTrend = F?.daily_trend?.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" }),
  })) || [];

  const yesterdayUnits = dailyTrend[dailyTrend.length - 2]?.units || 0;
  const todayUnits     = dailyTrend[dailyTrend.length - 1]?.units || 0;
  const todayDelta     = yesterdayUnits
    ? Math.round(((todayUnits - yesterdayUnits) / yesterdayUnits) * 100)
    : 0;

  const sparkProduction = dailyTrend.map((d, i) => ({ x: i, y: d.units }));
  const sparkUtil       = dailyTrend.map((d, i) => ({ x: i, y: F?.avg_utilization_percent || 0 }));
  const sparkRate       = dailyTrend.map((d, i) => ({ x: i, y: d.units / 9 || 0 }));
  const sparkTime       = dailyTrend.map((d, i) => ({ x: i, y: d.productive_minutes || 0 }));

  const loading = factory.loading && !factory.data;
  const error   = factory.error || workers.error || workstations.error;

  return (
    <div className="page">
      <Header
        dateFilter={dateFilter} setDateFilter={setDateFilter}
        search={search} setSearch={setSearch}
        theme={theme} onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        onReseed={handleReseed} seeding={seeding}
      />

      <main className="content">
        {error && (
          <div style={{ background: "var(--accent-bad-soft)", color: "var(--accent-bad)", padding: "12px 16px", borderRadius: 8, fontSize: 13 }}>
            Error: {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            Loading dashboard…
          </div>
        ) : F && (
          <>
            {/* Hero */}
            <section className="hero">
              <div className="hero-meta">
                <div className="eyebrow">Operations · Factory Floor · Shift 09:00–17:00</div>
                <h1 className="hero-title">Productivity, in real time.</h1>
                <p className="hero-sub">
                  {F.total_days}-day window · {F.total_workers} workers across {F.total_workstations} stations · Lunch 13:00–14:00
                </p>
              </div>
              <div className="hero-side">
                <div className="eyebrow">Today vs. yesterday</div>
                <div className={`hero-stat-num ${todayDelta >= 0 ? "good" : "warn"}`}>
                  {todayDelta >= 0 ? "+" : ""}{todayDelta}%
                </div>
                <div className="dim mono small">
                  {formatNumber(todayUnits)} units · {dailyTrend[dailyTrend.length - 1]?.label || ""}
                </div>
              </div>
            </section>

            {/* KPI strip */}
            <section className="kpi-strip">
              <KpiCard
                label="Total production"
                value={formatNumber(F.total_production_count)}
                unit="units"
                sublabel={`${F.total_workers} workers · ${F.total_days}d`}
                trend={+8}
                sparkData={sparkProduction}
                sparkAsBars
                accent="good"
              />
              <KpiCard
                label="Avg production rate"
                value={F.avg_production_rate}
                unit="u/hr"
                sublabel="Across all workers"
                trend={+3}
                sparkData={sparkRate}
                accent="good"
              />
              <KpiCard
                label="Avg utilization"
                value={F.avg_utilization_percent}
                unit="%"
                sublabel={`${F.total_workstations} workstations`}
                trend={-2}
                sparkData={sparkUtil}
                accent="warn"
              />
              <KpiCard
                label="Productive time"
                value={formatMinutes(F.total_productive_time_minutes)}
                sublabel={`Of ${formatMinutes(420 * F.total_workers * F.total_days)} scheduled`}
                trend={+5}
                sparkData={sparkTime}
                accent="neutral"
              />
            </section>

            {/* Trend chart */}
            <section className="block">
              <SectionHeader
                eyebrow="Output"
                title="Daily production"
                action={
                  <div className="chart-legend">
                    <span className="legend-key">
                      <span className="swatch" style={{ background: "var(--ink-1)" }} /> Units produced
                    </span>
                    <span className="legend-key">
                      <span className="swatch" style={{ background: "var(--accent-good)" }} /> Hover
                    </span>
                  </div>
                }
              />
              <div className="trend-wrap">
                <TrendChart data={dailyTrend} />
              </div>
            </section>

            {/* Tables */}
            <section className="block">
              <SectionHeader
                eyebrow="Workforce"
                title={tab === "workers" ? "Workers" : "Workstations"}
                action={
                  <Tabs
                    value={tab}
                    onChange={setTab}
                    tabs={[
                      { value: "workers",  label: "Workers",      count: workers.data?.length },
                      { value: "stations", label: "Workstations", count: workstations.data?.length },
                    ]}
                  />
                }
              />
              {tab === "workers" ? (
                <WorkerTable
                  workers={filteredWorkers}
                  onSelect={handleSelectWorker}
                  selectedId={selected?.entity?.worker_id}
                />
              ) : (
                <WorkstationTable
                  workstations={filteredStations}
                  onSelect={handleSelectStation}
                  selectedId={selected?.entity?.station_id}
                />
              )}
            </section>

            <footer className="footer">
              <div className="dim mono small">Shift 09:00–17:00 · Lunch 13:00–14:00 · Event interval 15m</div>
              <div className="dim mono small">build {new Date().toISOString().slice(0, 10)}</div>
            </footer>
          </>
        )}
      </main>

      <DetailPanel entity={selected?.entity} type={selected?.type} onClose={handleClose} />

      <TweaksPanel
        theme={theme} setTheme={setTheme}
        accent={accent} setAccent={setAccent}
        serifNumerals={serifNumerals} setSerif={setSerif}
        denseTables={denseTables} setDense={setDense}
      />
    </div>
  );
}
