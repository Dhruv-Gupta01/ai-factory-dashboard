import React from "react";
import MetricCard from "./MetricCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function DetailPanel({ data, type, onClose }) {
  if (!data) return null;

  const isWorker = type === "worker";
  const title = isWorker
    ? `${data.name} (${data.worker_id})`
    : `${data.name} (${data.station_id})`;

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <button
          onClick={onClose}
          className="rounded px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          Close
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {isWorker ? (
          <>
            <MetricCard
              title="Active Time"
              value={formatMinutes(data.active_time_minutes)}
              color="green"
            />
            <MetricCard
              title="Idle Time"
              value={formatMinutes(data.idle_time_minutes)}
              color="red"
            />
            <MetricCard
              title="Utilization"
              value={`${data.utilization_percent}%`}
              color="blue"
            />
            <MetricCard
              title="Units Produced"
              value={data.total_units}
              subtitle={`${data.units_per_hour} units/hr`}
              color="purple"
            />
          </>
        ) : (
          <>
            <MetricCard
              title="Occupancy Time"
              value={formatMinutes(data.occupancy_time_minutes)}
              color="green"
            />
            <MetricCard
              title="Utilization"
              value={`${data.utilization_percent}%`}
              color="blue"
            />
            <MetricCard
              title="Units Produced"
              value={data.total_units}
              color="purple"
            />
            <MetricCard
              title="Throughput"
              value={`${data.throughput_rate} u/hr`}
              color="yellow"
            />
          </>
        )}
      </div>

      {data.daily_breakdown && data.daily_breakdown.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-600">Daily Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily_breakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="units" fill="#8b5cf6" name="Units" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isWorker && data.assigned_workers && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-600">Assigned Workers</h3>
          <div className="flex flex-wrap gap-2">
            {data.assigned_workers.map((w) => (
              <span
                key={w.worker_id}
                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {w.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
