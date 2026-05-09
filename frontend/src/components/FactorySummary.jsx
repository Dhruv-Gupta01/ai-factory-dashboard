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
  Legend,
} from "recharts";

function formatMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function FactorySummary({ data }) {
  if (!data) return null;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-800">Factory Overview</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard
          title="Total Productive Time"
          value={formatMinutes(data.total_productive_time_minutes)}
          subtitle={`Across ${data.total_days} days`}
          color="green"
        />
        <MetricCard
          title="Total Production"
          value={`${data.total_production_count} units`}
          subtitle={`${data.total_workers} workers active`}
          color="blue"
        />
        <MetricCard
          title="Avg Production Rate"
          value={`${data.avg_production_rate} units/hr`}
          subtitle="Across all workers"
          color="purple"
        />
        <MetricCard
          title="Avg Utilization"
          value={`${data.avg_utilization_percent}%`}
          subtitle={`${data.total_workstations} workstations`}
          color="yellow"
        />
      </div>

      {data.daily_trend && data.daily_trend.length > 0 && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-600">Daily Production Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.daily_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="units" fill="#3b82f6" name="Units Produced" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
