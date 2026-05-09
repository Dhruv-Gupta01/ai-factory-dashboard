import React from "react";
import { formatMinutes, formatNumber, UtilMeter, StatusPill, Sparkline } from "./Primitives";

function AvatarStack({ workers }) {
  if (!workers || workers.length === 0) return <span className="dim mono">—</span>;
  const list = Array.isArray(workers) && typeof workers[0] === "object"
    ? workers
    : workers.split(", ").map((name, i) => ({ name, worker_id: i }));
  return (
    <div className="avatar-stack">
      {list.map((w, i) => (
        <span key={w.worker_id ?? i} className="avatar" style={{ zIndex: 10 - i }} title={w.name}>
          {(w.name || "").split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </span>
      ))}
    </div>
  );
}

function StationRow({ s, selected, onSelect }) {
  const spark = (s.daily_breakdown || []).map((d, i) => ({ x: i, y: d.units }));
  const statusKind = s.utilization_percent >= 75 ? "good" : "warn";
  const statusLabel = s.utilization_percent >= 75 ? "Running" : "Underused";

  const workers = Array.isArray(s.assigned_workers)
    ? s.assigned_workers
    : (s.assigned_workers || "").split(", ").filter(Boolean).map((name, i) => ({ name, worker_id: i }));

  return (
    <tr onClick={() => onSelect(s)} className={`row ${selected ? "row-selected" : ""}`}>
      <td className="cell-id">
        <div className="id-stack">
          <span className="mono dim">{s.station_id}</span>
          <span className="name">{s.name}</span>
          <span className="role" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.type}</span>
        </div>
      </td>
      <td><StatusPill kind={statusKind} label={statusLabel} /></td>
      <td><AvatarStack workers={workers} /></td>
      <td className="num">{formatMinutes(s.occupancy_time_minutes)}</td>
      <td><UtilMeter percent={s.utilization_percent} /></td>
      <td className="num strong">{formatNumber(s.total_units)}</td>
      <td className="num">{s.throughput_rate} <span className="dim">u/hr</span></td>
      <td className="spark-cell">
        <Sparkline data={spark} width={80} height={24} asBars stroke="var(--ink-2)" />
      </td>
    </tr>
  );
}

export default function WorkstationTable({ workstations, onSelect, selectedId }) {
  if (!workstations || workstations.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Workstation</th>
            <th>Status</th>
            <th>Crew</th>
            <th>Occupancy</th>
            <th>Utilization</th>
            <th className="num">Units</th>
            <th className="num">Throughput</th>
            <th>7-day</th>
          </tr>
        </thead>
        <tbody>
          {workstations.map((s) => (
            <StationRow key={s.station_id} s={s} onSelect={onSelect} selected={selectedId === s.station_id} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
