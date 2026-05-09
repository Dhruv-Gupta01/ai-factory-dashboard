const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../factory.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    createTables();
  }
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workstations (
      station_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workers (
      worker_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      workstation_id TEXT NOT NULL,
      FOREIGN KEY (workstation_id) REFERENCES workstations(station_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      worker_id TEXT NOT NULL,
      workstation_id TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('working', 'idle', 'absent', 'product_count')),
      confidence REAL NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
      FOREIGN KEY (workstation_id) REFERENCES workstations(station_id),
      UNIQUE(worker_id, workstation_id, timestamp, event_type)
    );

    CREATE INDEX IF NOT EXISTS idx_events_worker ON events(worker_id);
    CREATE INDEX IF NOT EXISTS idx_events_workstation ON events(workstation_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
  `);
}

module.exports = { getDb };
