import React from "react";

export default function MetricCard({ title, value, subtitle, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    red: "bg-red-50 border-red-200 text-red-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color] || colors.blue}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {subtitle && <p className="mt-1 text-xs opacity-60">{subtitle}</p>}
    </div>
  );
}
