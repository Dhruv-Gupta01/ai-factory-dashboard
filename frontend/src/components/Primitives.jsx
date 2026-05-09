import React, { useState } from "react";

export function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
export function formatNumber(n) {
  return Number(n).toLocaleString("en-US");
}

export function TickRule({ count = 80 }) {
  return (
    <div className="tick-rule" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`tick ${i % 5 === 0 ? "tick-major" : ""}`} />
      ))}
    </div>
  );
}

export function LiveDot() {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "var(--accent-good)", opacity: 0.6,
        animation: "livepulse 2.4s ease-in-out infinite",
      }} />
      <span style={{ position: "relative", width: 8, height: 8, borderRadius: "50%", background: "var(--accent-good)", display: "inline-flex" }} />
    </span>
  );
}

export function Sparkline({ data, width = 120, height = 32, stroke, fill, asBars = false }) {
  if (!data || data.length === 0) return null;
  const ys = data.map((d) => (typeof d === "number" ? d : d.y ?? d.units ?? 0));
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const stepX = width / Math.max(ys.length - 1, 1);

  if (asBars) {
    const bw = Math.max(2, stepX - 2);
    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {ys.map((y, i) => {
          const h = ((y - minY) / range) * (height - 4) + 3;
          return <rect key={i} x={i * stepX} y={height - h} width={bw} height={h} rx="1" fill={stroke || "var(--accent-good)"} opacity="0.85" />;
        })}
      </svg>
    );
  }

  const points = ys.map((y, i) => {
    const px = i * stepX;
    const py = height - 2 - ((y - minY) / range) * (height - 4);
    return [px, py];
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={areaPath} fill={fill || "var(--accent-good-soft)"} />
      <path d={path} fill="none" stroke={stroke || "var(--accent-good)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={stroke || "var(--accent-good)"} />
    </svg>
  );
}

export function KpiCard({ label, value, unit, sublabel, trend, sparkData, sparkAsBars = false, accent = "good" }) {
  const stroke = accent === "good" ? "var(--accent-good)" : accent === "warn" ? "var(--accent-warn)" : "var(--ink-2)";
  const fill   = accent === "good" ? "var(--accent-good-soft)" : accent === "warn" ? "var(--accent-warn-soft)" : "var(--ink-soft)";
  return (
    <div className="kpi-card">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span className="label">{label}</span>
        {trend != null && (
          <span className={`kpi-trend ${trend >= 0 ? "trend-up" : "trend-down"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="metric-row">
        <span className="metric-num">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="kpi-foot">
        <span className="sublabel">{sublabel}</span>
        <Sparkline data={sparkData} stroke={stroke} fill={fill} asBars={sparkAsBars} width={92} height={26} />
      </div>
    </div>
  );
}

export function TrendChart({ data }) {
  const [hover, setHover] = useState(null);
  if (!data || data.length === 0) return null;

  const width = 920, height = 240;
  const padL = 40, padR = 16, padT = 16, padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const ys = data.map((d) => d.units);
  const maxY = Math.ceil(Math.max(...ys) / 50) * 50 || 50;
  const stepX = innerW / data.length;
  const bw = stepX * 0.62;
  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="trend-svg">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padT + (innerH / yTicks) * i;
        const v = Math.round(maxY - (maxY / yTicks) * i);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--rule)" strokeWidth="1" strokeDasharray={i === yTicks ? "0" : "2 4"} />
            <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">{v}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (d.units / maxY) * innerH;
        const x = padL + i * stepX + (stepX - bw) / 2;
        const y = padT + innerH - h;
        const isHover = hover === i;
        return (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={padL + i * stepX} y={padT} width={stepX} height={innerH} fill="transparent" />
            <rect x={x} y={y} width={bw} height={h} rx="1" fill={isHover ? "var(--accent-good)" : "var(--ink-1)"} />
            <text x={x + bw / 2} y={height - 10} textAnchor="middle" className="axis-label">
              {d.label || d.date?.slice(5)}
            </text>
            {isHover && (
              <g>
                <rect x={x + bw / 2 - 32} y={y - 28} width="64" height="22" rx="3" fill="var(--ink-1)" />
                <text x={x + bw / 2} y={y - 13} textAnchor="middle" className="tooltip-label">{d.units} units</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function UtilMeter({ percent, segments = 10 }) {
  const filled = Math.round((percent / 100) * segments);
  const cls = percent >= 75 ? "good" : percent >= 50 ? "warn" : "bad";
  return (
    <div className="util-meter" title={`${percent}% utilization`}>
      <div className="util-segs">
        {Array.from({ length: segments }).map((_, i) => (
          <span key={i} className={`useg ${i < filled ? `on ${cls}` : ""}`} />
        ))}
      </div>
      <span className="util-num">{percent}%</span>
    </div>
  );
}

export function StatusPill({ kind, label }) {
  return <span className={`pill pill-${kind}`}>{label}</span>;
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="tab-strip" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`tab ${value === t.value ? "tab-active" : ""}`}
        >
          <span>{t.label}</span>
          {t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
      </div>
      {action}
      <TickRule />
    </div>
  );
}
