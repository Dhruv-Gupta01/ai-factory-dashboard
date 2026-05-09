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

export default function WorkstationTable({ workstations, onSelect, selectedId }) {
  if (!workstations || workstations.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-800">Workstations</h2>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Station</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Assigned Workers</th>
              <th className="px-4 py-3">Occupancy Time</th>
              <th className="px-4 py-3">Utilization</th>
              <th className="px-4 py-3">Units</th>
              <th className="px-4 py-3">Throughput</th>
            </tr>
          </thead>
          <tbody>
            {workstations.map((s) => (
              <tr
                key={s.station_id}
                onClick={() => onSelect(s.station_id)}
                className={`cursor-pointer border-b transition-colors hover:bg-blue-50 ${
                  selectedId === s.station_id ? "bg-blue-100" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium">
                  <span className="mr-2 text-xs text-gray-400">{s.station_id}</span>
                  {s.name}
                </td>
                <td className="px-4 py-3 text-gray-500 capitalize">{s.type}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{s.assigned_workers}</td>
                <td className="px-4 py-3">{formatMinutes(s.occupancy_time_minutes)}</td>
                <td className="px-4 py-3">
                  <UtilizationBar percent={s.utilization_percent} />
                </td>
                <td className="px-4 py-3 font-semibold">{s.total_units}</td>
                <td className="px-4 py-3">{s.throughput_rate} u/hr</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
