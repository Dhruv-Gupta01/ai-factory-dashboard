const express = require("express");
const router = express.Router();
const { getDb } = require("../db/init");

const INTERVAL_MINUTES = 15;
const SHIFT_HOURS = 7; // 9-5 minus 1hr lunch
const INTERVALS_PER_SHIFT = (SHIFT_HOURS * 60) / INTERVAL_MINUTES;

function getDateFilter(query) {
  if (query.date) return { sql: "AND timestamp LIKE ?", params: [`${query.date}%`] };
  if (query.from && query.to) {
    return { sql: "AND timestamp >= ? AND timestamp <= ?", params: [query.from, query.to] };
  }
  return { sql: "", params: [] };
}

router.get("/workers", (req, res) => {
  const db = getDb();
  const dateFilter = getDateFilter(req.query);

  const workers = db.prepare("SELECT * FROM workers").all();

  const metricsQuery = db.prepare(`
    SELECT
      e.worker_id,
      SUM(CASE WHEN e.event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as active_intervals,
      SUM(CASE WHEN e.event_type = 'idle' THEN 1 ELSE 0 END) as idle_intervals,
      SUM(CASE WHEN e.event_type = 'absent' THEN 1 ELSE 0 END) as absent_intervals,
      COUNT(*) as total_intervals,
      SUM(e.count) as total_units,
      COUNT(DISTINCT DATE(e.timestamp)) as days_worked
    FROM events e
    WHERE 1=1 ${dateFilter.sql}
    GROUP BY e.worker_id
  `);

  const metricsRows = metricsQuery.all(...dateFilter.params);
  const metricsMap = {};
  for (const row of metricsRows) {
    metricsMap[row.worker_id] = row;
  }

  const result = workers.map((w) => {
    const m = metricsMap[w.worker_id] || {
      active_intervals: 0,
      idle_intervals: 0,
      absent_intervals: 0,
      total_intervals: 0,
      total_units: 0,
      days_worked: 0,
    };

    const activeMinutes = m.active_intervals * INTERVAL_MINUTES;
    const idleMinutes = m.idle_intervals * INTERVAL_MINUTES;
    const totalMinutes = m.total_intervals * INTERVAL_MINUTES;
    const totalShiftMinutes = m.days_worked * SHIFT_HOURS * 60;
    const utilization = totalShiftMinutes > 0 ? Math.round((activeMinutes / totalShiftMinutes) * 100) : 0;
    const activeHours = activeMinutes / 60;
    const unitsPerHour = activeHours > 0 ? Math.round((m.total_units / activeHours) * 10) / 10 : 0;

    return {
      ...w,
      active_time_minutes: activeMinutes,
      idle_time_minutes: idleMinutes,
      total_units: m.total_units,
      utilization_percent: utilization,
      units_per_hour: unitsPerHour,
      days_worked: m.days_worked,
    };
  });

  res.json(result);
});

router.get("/workers/:id", (req, res) => {
  const db = getDb();
  const dateFilter = getDateFilter(req.query);
  const workerId = req.params.id;

  const worker = db.prepare("SELECT * FROM workers WHERE worker_id = ?").get(workerId);
  if (!worker) return res.status(404).json({ error: "Worker not found" });

  const metrics = db.prepare(`
    SELECT
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as active_intervals,
      SUM(CASE WHEN event_type = 'idle' THEN 1 ELSE 0 END) as idle_intervals,
      SUM(CASE WHEN event_type = 'absent' THEN 1 ELSE 0 END) as absent_intervals,
      COUNT(*) as total_intervals,
      SUM(count) as total_units,
      COUNT(DISTINCT DATE(timestamp)) as days_worked
    FROM events
    WHERE worker_id = ? ${dateFilter.sql}
  `).get(workerId, ...dateFilter.params);

  const dailyBreakdown = db.prepare(`
    SELECT
      DATE(timestamp) as date,
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as active_intervals,
      SUM(CASE WHEN event_type = 'idle' THEN 1 ELSE 0 END) as idle_intervals,
      SUM(count) as units
    FROM events
    WHERE worker_id = ? ${dateFilter.sql}
    GROUP BY DATE(timestamp)
    ORDER BY date
  `).all(workerId, ...dateFilter.params);

  const activeMinutes = metrics.active_intervals * INTERVAL_MINUTES;
  const idleMinutes = metrics.idle_intervals * INTERVAL_MINUTES;
  const totalShiftMinutes = metrics.days_worked * SHIFT_HOURS * 60;
  const utilization = totalShiftMinutes > 0 ? Math.round((activeMinutes / totalShiftMinutes) * 100) : 0;
  const activeHours = activeMinutes / 60;
  const unitsPerHour = activeHours > 0 ? Math.round((metrics.total_units / activeHours) * 10) / 10 : 0;

  res.json({
    ...worker,
    active_time_minutes: activeMinutes,
    idle_time_minutes: idleMinutes,
    total_units: metrics.total_units,
    utilization_percent: utilization,
    units_per_hour: unitsPerHour,
    days_worked: metrics.days_worked,
    daily_breakdown: dailyBreakdown.map((d) => ({
      date: d.date,
      active_minutes: d.active_intervals * INTERVAL_MINUTES,
      idle_minutes: d.idle_intervals * INTERVAL_MINUTES,
      units: d.units,
    })),
  });
});

router.get("/workstations", (req, res) => {
  const db = getDb();
  const dateFilter = getDateFilter(req.query);

  const workstations = db.prepare("SELECT * FROM workstations").all();

  const metricsQuery = db.prepare(`
    SELECT
      e.workstation_id,
      SUM(CASE WHEN e.event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as occupied_intervals,
      COUNT(*) as total_intervals,
      SUM(e.count) as total_units,
      COUNT(DISTINCT DATE(e.timestamp)) as days_active
    FROM events e
    WHERE 1=1 ${dateFilter.sql}
    GROUP BY e.workstation_id
  `);

  const metricsRows = metricsQuery.all(...dateFilter.params);
  const metricsMap = {};
  for (const row of metricsRows) {
    metricsMap[row.workstation_id] = row;
  }

  const assignedWorkers = db.prepare(`
    SELECT workstation_id, GROUP_CONCAT(name, ', ') as workers
    FROM workers
    GROUP BY workstation_id
  `).all();
  const workersMap = {};
  for (const row of assignedWorkers) {
    workersMap[row.workstation_id] = row.workers;
  }

  const result = workstations.map((s) => {
    const m = metricsMap[s.station_id] || {
      occupied_intervals: 0,
      total_intervals: 0,
      total_units: 0,
      days_active: 0,
    };

    const occupancyMinutes = m.occupied_intervals * INTERVAL_MINUTES;
    const totalShiftMinutes = m.days_active * SHIFT_HOURS * 60;
    const utilization = totalShiftMinutes > 0 ? Math.round((occupancyMinutes / totalShiftMinutes) * 100) : 0;
    const occupancyHours = occupancyMinutes / 60;
    const throughputRate = occupancyHours > 0 ? Math.round((m.total_units / occupancyHours) * 10) / 10 : 0;

    return {
      ...s,
      assigned_workers: workersMap[s.station_id] || "",
      occupancy_time_minutes: occupancyMinutes,
      utilization_percent: utilization,
      total_units: m.total_units,
      throughput_rate: throughputRate,
      days_active: m.days_active,
    };
  });

  res.json(result);
});

router.get("/workstations/:id", (req, res) => {
  const db = getDb();
  const dateFilter = getDateFilter(req.query);
  const stationId = req.params.id;

  const station = db.prepare("SELECT * FROM workstations WHERE station_id = ?").get(stationId);
  if (!station) return res.status(404).json({ error: "Workstation not found" });

  const metrics = db.prepare(`
    SELECT
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as occupied_intervals,
      COUNT(*) as total_intervals,
      SUM(count) as total_units,
      COUNT(DISTINCT DATE(timestamp)) as days_active
    FROM events
    WHERE workstation_id = ? ${dateFilter.sql}
  `).get(stationId, ...dateFilter.params);

  const dailyBreakdown = db.prepare(`
    SELECT
      DATE(timestamp) as date,
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as occupied_intervals,
      SUM(count) as units
    FROM events
    WHERE workstation_id = ? ${dateFilter.sql}
    GROUP BY DATE(timestamp)
    ORDER BY date
  `).all(stationId, ...dateFilter.params);

  const workers = db.prepare("SELECT worker_id, name FROM workers WHERE workstation_id = ?").all(stationId);

  const occupancyMinutes = metrics.occupied_intervals * INTERVAL_MINUTES;
  const totalShiftMinutes = metrics.days_active * SHIFT_HOURS * 60;
  const utilization = totalShiftMinutes > 0 ? Math.round((occupancyMinutes / totalShiftMinutes) * 100) : 0;
  const occupancyHours = occupancyMinutes / 60;
  const throughputRate = occupancyHours > 0 ? Math.round((metrics.total_units / occupancyHours) * 10) / 10 : 0;

  res.json({
    ...station,
    assigned_workers: workers,
    occupancy_time_minutes: occupancyMinutes,
    utilization_percent: utilization,
    total_units: metrics.total_units,
    throughput_rate: throughputRate,
    days_active: metrics.days_active,
    daily_breakdown: dailyBreakdown.map((d) => ({
      date: d.date,
      occupancy_minutes: d.occupied_intervals * INTERVAL_MINUTES,
      units: d.units,
    })),
  });
});

router.get("/factory", (req, res) => {
  const db = getDb();
  const dateFilter = getDateFilter(req.query);

  const metrics = db.prepare(`
    SELECT
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as total_active_intervals,
      SUM(CASE WHEN event_type = 'idle' THEN 1 ELSE 0 END) as total_idle_intervals,
      COUNT(*) as total_intervals,
      SUM(count) as total_units,
      COUNT(DISTINCT worker_id) as total_workers,
      COUNT(DISTINCT workstation_id) as total_workstations,
      COUNT(DISTINCT DATE(timestamp)) as total_days
    FROM events
    WHERE 1=1 ${dateFilter.sql}
  `).get(...dateFilter.params);

  const workerUtilizations = db.prepare(`
    SELECT
      worker_id,
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) * 1.0 /
        (COUNT(DISTINCT DATE(timestamp)) * ${INTERVALS_PER_SHIFT}) * 100 as utilization
    FROM events
    WHERE 1=1 ${dateFilter.sql}
    GROUP BY worker_id
  `).all(...dateFilter.params);

  const avgUtilization = workerUtilizations.length > 0
    ? Math.round(workerUtilizations.reduce((sum, w) => sum + w.utilization, 0) / workerUtilizations.length)
    : 0;

  const productiveMinutes = metrics.total_active_intervals * INTERVAL_MINUTES;
  const productiveHours = productiveMinutes / 60;
  const avgProductionRate = productiveHours > 0
    ? Math.round((metrics.total_units / productiveHours) * 10) / 10
    : 0;

  const dailyTrend = db.prepare(`
    SELECT
      DATE(timestamp) as date,
      SUM(CASE WHEN event_type IN ('working', 'product_count') THEN 1 ELSE 0 END) as active_intervals,
      SUM(count) as units
    FROM events
    WHERE 1=1 ${dateFilter.sql}
    GROUP BY DATE(timestamp)
    ORDER BY date
  `).all(...dateFilter.params);

  res.json({
    total_productive_time_minutes: productiveMinutes,
    total_production_count: metrics.total_units,
    avg_production_rate: avgProductionRate,
    avg_utilization_percent: avgUtilization,
    total_workers: metrics.total_workers,
    total_workstations: metrics.total_workstations,
    total_days: metrics.total_days,
    daily_trend: dailyTrend.map((d) => ({
      date: d.date,
      productive_minutes: d.active_intervals * INTERVAL_MINUTES,
      units: d.units,
    })),
  });
});

module.exports = router;
