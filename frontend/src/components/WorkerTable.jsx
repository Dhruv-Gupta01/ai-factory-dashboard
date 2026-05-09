import React from "react";
import { formatMinutes, formatNumber, UtilMeter, Sparkline } from "./Primitives";

function WorkerRow({ w, selected, onSelect }) {
  const spark = (w.daily_breakdown || []).map((d, i) => ({ x: i, y: d.units }));
  return (
    <tr onClick={() => onSelect(w)} className={`row ${selected ? "row-selected" : ""}`}>
      <td className="cell-id">
        <div className="id-stack">
          <span className="mono dim">{w.worker_id}</span>
          <span className="name">{w.name}</span>
          <span className="role">{w.workstation_id}</span>
        </div>
      </td>
      <td className="mono dim">{w.workstation_id}</td>
      <td className="num">{formatMinutes(w.active_time_minutes)}</td>
      <td className="num dim">{formatMinutes(w.idle_time_minutes)}</td>
      <td><UtilMeter percent={w.utilization_percent} /></td>
      <td className="num strong">{formatNumber(w.total_units)}</td>
      <td className="num">{w.units_per_hour}</td>
      <td className="spark-cell">
        <Sparkline data={spark} width={80} height={24} asBars stroke="var(--ink-2)" />
      </td>
    </tr>
  );
}

export default function WorkerTable({ workers, onSelect, selectedId }) {
  if (!workers || workers.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Worker</th>
            <th>Station</th>
            <th>Active</th>
            <th>Idle</th>
            <th>Utilization</th>
            <th className="num">Units</th>
            <th className="num">u/hr</th>
            <th>7-day</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => (
            <WorkerRow key={w.worker_id} w={w} onSelect={onSelect} selected={selectedId === w.worker_id} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
