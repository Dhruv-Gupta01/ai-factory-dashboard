import React from "react";

function formatMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function UtilizationBar({ percent }) {
  const color =
    percent >= 75 ? "bg-green-500" : percent >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-sm font-medium">{percent}%</span>
    </div>
  );
}

export default function WorkerTable({ workers, onSelect, selectedId }) {
  if (!workers || workers.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-800">Workers</h2>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Worker</th>
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Active Time</th>
              <th className="px-4 py-3">Idle Time</th>
              <th className="px-4 py-3">Utilization</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Units/Hr</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr
                key={w.worker_id}
                onClick={() => onSelect(w.worker_id)}
                className={`cursor-pointer border-b transition-colors hover:bg-blue-50 ${
                  selectedId === w.worker_id ? "bg-blue-100" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium">
                  <span className="mr-2 text-xs text-gray-400">{w.worker_id}</span>
                  {w.name}
                </td>
                <td className="px-4 py-3 text-gray-500">{w.workstation_id}</td>
                <td className="px-4 py-3">{formatMinutes(w.active_time_minutes)}</td>
                <td className="px-4 py-3 text-gray-500">{formatMinutes(w.idle_time_minutes)}</td>
                <td className="px-4 py-3">
                  <UtilizationBar percent={w.utilization_percent} />
                </td>
                <td className="px-4 py-3 font-semibold">{w.total_units}</td>
                <td className="px-4 py-3">{w.units_per_hour}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
