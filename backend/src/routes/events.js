const express = require("express");
const router = express.Router();
const { getDb } = require("../db/init");

const VALID_EVENT_TYPES = ["working", "idle", "absent", "product_count"];

function validateEvent(event) {
  const errors = [];
  if (!event.timestamp) errors.push("timestamp is required");
  if (!event.worker_id) errors.push("worker_id is required");
  if (!event.workstation_id) errors.push("workstation_id is required");
  if (!event.event_type || !VALID_EVENT_TYPES.includes(event.event_type)) {
    errors.push(`event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}`);
  }
  if (event.confidence === undefined || event.confidence < 0 || event.confidence > 1) {
    errors.push("confidence must be between 0 and 1");
  }
  if (event.count !== undefined && (!Number.isInteger(event.count) || event.count < 0)) {
    errors.push("count must be a non-negative integer");
  }
  return errors;
}

router.post("/", (req, res) => {
  const event = req.body;
  const errors = validateEvent(event);
  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      event.timestamp,
      event.worker_id,
      event.workstation_id,
      event.event_type,
      event.confidence,
      event.count || 0
    );

    if (result.changes === 0) {
      return res.status(200).json({ message: "Duplicate event ignored", duplicate: true });
    }

    res.status(201).json({ message: "Event ingested", id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: "Failed to ingest event", details: err.message });
  }
});

router.post("/batch", (req, res) => {
  const events = req.body;
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: "Body must be an array of events" });
  }

  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let ingested = 0;
  let duplicates = 0;
  const errors = [];

  const insertAll = db.transaction(() => {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const validationErrors = validateEvent(event);
      if (validationErrors.length > 0) {
        errors.push({ index: i, errors: validationErrors });
        continue;
      }
      const result = stmt.run(
        event.timestamp,
        event.worker_id,
        event.workstation_id,
        event.event_type,
        event.confidence,
        event.count || 0
      );
      if (result.changes === 0) duplicates++;
      else ingested++;
    }
  });

  try {
    insertAll();
    res.status(201).json({ ingested, duplicates, errors });
  } catch (err) {
    res.status(500).json({ error: "Batch ingestion failed", details: err.message });
  }
});

router.get("/", (req, res) => {
  const db = getDb();
  const { worker_id, workstation_id, date, limit = 100, offset = 0 } = req.query;

  let sql = "SELECT * FROM events WHERE 1=1";
  const params = [];

  if (worker_id) {
    sql += " AND worker_id = ?";
    params.push(worker_id);
  }
  if (workstation_id) {
    sql += " AND workstation_id = ?";
    params.push(workstation_id);
  }
  if (date) {
    sql += " AND timestamp LIKE ?";
    params.push(`${date}%`);
  }

  sql += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  const events = db.prepare(sql).all(...params);
  res.json(events);
});

module.exports = router;
