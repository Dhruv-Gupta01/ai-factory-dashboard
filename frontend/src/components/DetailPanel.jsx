import React from "react";
import { formatMinutes, formatNumber, TickRule } from "./Primitives";

function DetailPanelBody({ entity, type, onClose }) {
  const isWorker = type === "worker";
  const id = isWorker ? entity.worker_id : entity.station_id;
  const subtitle = isWorker
    ? `Station ${entity.workstation_id}`
    : `${(entity.type || "").toUpperCase()}`;

  const stats = isWorker
    ? [
        { label: "Active",      value: formatMinutes(entity.active_time_minutes),  accent: "good" },
        { label: "Idle",        value: formatMinutes(entity.idle_time_minutes),     accent: "warn" },
        { label: "Utilization", value: `${entity.utilization_percent}%`,            accent: "neutral" },
        { label: "Units / hr",  value: entity.units_per_hour,                       accent: "neutral" },
      ]
    : [
        { label: "Occupancy",   value: formatMinutes(entity.occupancy_time_minutes), accent: "good" },
        { label: "Utilization", value: `${entity.utilization_percent}%`,             accent: "neutral" },
        { label: "Units (7d)",  value: formatNumber(entity.total_units),             accent: "neutral" },
        { label: "Throughput",  value: `${entity.throughput_rate} u/hr`,             accent: "warn" },
      ];

  const breakdown = entity.daily_breakdown || [];
  const maxDaily = Math.max(...breakdown.map((d) => d.units), 1);

  const workerList = !isWorker
    ? (Array.isArray(entity.assigned_workers)
        ? entity.assigned_workers
        : (entity.assigned_workers || "").split(", ").filter(Boolean).map((name, i) => ({ name, worker_id: i, utilization_percent: "—" })))
    : [];

  return (
    <div className="detail-body">
      <div className="detail-head">
        <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        <div className="eyebrow">{isWorker ? "Worker profile" : "Workstation profile"}</div>
        <div className="detail-title-row">
          <h2 className="detail-title">{entity.name}</h2>
          <span className="mono dim detail-id">{id}</span>
        </div>
        <div className="detail-sub">{subtitle}</div>
        <TickRule count={48} />
      </div>

      <div className="detail-stats">
        {stats.map((s) => (
          <div key={s.label} className="stat-block">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.accent === "neutral" ? "" : s.accent}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {breakdown.length > 0 && (
        <div className="detail-section">
          <div className="eyebrow">Daily output · last {breakdown.length} days</div>
          <div className="day-bars">
            {breakdown.map((d) => {
              const h = (d.units / maxDaily) * 100;
              const isPeak = d.units === maxDaily;
              const label = d.label || d.date?.slice(5) || "";
              return (
                <div key={d.date} className="day-bar">
                  <div className="day-bar-track">
                    <div className="day-bar-fill" style={{ height: `${h}%`, background: isPeak ? "var(--accent-good)" : "var(--ink-2)" }} />
                  </div>
                  <div className="day-bar-units mono">{d.units}</div>
                  <div className="day-bar-label">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isWorker ? (
        <div className="detail-section">
          <div className="eyebrow">Performance signals</div>
          <ul className="signal-list">
            <li><span className="signal-key">Utilization</span><span className="signal-val mono">{entity.utilization_percent}%</span></li>
            <li><span className="signal-key">Units produced</span><span className="signal-val mono">{formatNumber(entity.total_units)}</span></li>
            <li><span className="signal-key">Pace vs peers</span><span className="signal-val">{entity.units_per_hour > 14 ? "Above median" : entity.units_per_hour > 10 ? "On median" : "Below median"}</span></li>
            <li><span className="signal-key">Idle pattern</span><span className="signal-val">{entity.idle_time_minutes < 400 ? "Steady" : "Bursty"}</span></li>
          </ul>
        </div>
      ) : (
        <div className="detail-section">
          <div className="eyebrow">Assigned crew · {workerList.length}</div>
          <ul className="crew-list">
            {workerList.map((w, i) => (
              <li key={w.worker_id ?? i} className="crew-item">
                <span className="avatar">
                  {(w.name || "").split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </span>
                <span className="crew-name">{w.name}</span>
                {w.worker_id && typeof w.worker_id === "string" && (
                  <span className="mono dim">{w.worker_id}</span>
                )}
              </li>
            ))}
            {workerList.length === 0 && <li className="dim" style={{ padding: "10px 0" }}>No crew assigned.</li>}
          </ul>
        </div>
      )}

      <div className="detail-foot">
        <button className="btn-ghost">Export profile</button>
        {isWorker
          ? <button className="btn-primary">View full timeline →</button>
          : <button className="btn-primary">Optimize allocation →</button>
        }
      </div>
    </div>
  );
}

export default function DetailPanel({ entity, type, onClose }) {
  const open = !!entity;
  return (
    <>
      <div className={`overlay ${open ? "overlay-open" : ""}`} onClick={onClose} />
      <aside className={`slide-over ${open ? "slide-over-open" : ""}`} aria-hidden={!open}>
        {entity && <DetailPanelBody entity={entity} type={type} onClose={onClose} />}
      </aside>
    </>
  );
}
