const { getDb } = require("./init");

const WORKSTATIONS = [
  { station_id: "S1", name: "Assembly Line A", type: "assembly" },
  { station_id: "S2", name: "Assembly Line B", type: "assembly" },
  { station_id: "S3", name: "Welding Station", type: "welding" },
  { station_id: "S4", name: "Quality Control", type: "inspection" },
  { station_id: "S5", name: "Packaging Unit", type: "packaging" },
  { station_id: "S6", name: "Paint Booth", type: "painting" },
];

const WORKERS = [
  { worker_id: "W1", name: "Alice Johnson", workstation_id: "S1" },
  { worker_id: "W2", name: "Bob Smith", workstation_id: "S2" },
  { worker_id: "W3", name: "Carol Davis", workstation_id: "S3" },
  { worker_id: "W4", name: "David Wilson", workstation_id: "S4" },
  { worker_id: "W5", name: "Eva Martinez", workstation_id: "S5" },
  { worker_id: "W6", name: "Frank Brown", workstation_id: "S6" },
];

const SHIFT_START = 9;
const SHIFT_END = 17;
const LUNCH_START = 13;
const LUNCH_END = 14;
const INTERVAL_MINUTES = 15;

function generateEvents(dateStr) {
  const events = [];

  for (const worker of WORKERS) {
    let hour = SHIFT_START;
    let minute = INTERVAL_MINUTES;

    while (hour < SHIFT_END || (hour === SHIFT_END && minute === 0)) {
      if (hour >= LUNCH_START && hour < LUNCH_END) {
        minute += INTERVAL_MINUTES;
        if (minute >= 60) {
          minute = minute - 60;
          hour++;
        }
        continue;
      }

      const timestamp = `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
      const rand = Math.random();

      let eventType;
      let count = 0;
      let confidence;

      if (rand < 0.65) {
        eventType = "working";
        count = Math.floor(Math.random() * 5) + 1;
        confidence = 0.85 + Math.random() * 0.14;
      } else if (rand < 0.80) {
        eventType = "product_count";
        count = Math.floor(Math.random() * 8) + 1;
        confidence = 0.80 + Math.random() * 0.18;
      } else if (rand < 0.93) {
        eventType = "idle";
        confidence = 0.75 + Math.random() * 0.2;
      } else {
        eventType = "absent";
        confidence = 0.88 + Math.random() * 0.11;
      }

      events.push({
        timestamp,
        worker_id: worker.worker_id,
        workstation_id: worker.workstation_id,
        event_type: eventType,
        confidence: Math.round(confidence * 100) / 100,
        count,
      });

      minute += INTERVAL_MINUTES;
      if (minute >= 60) {
        minute = minute - 60;
        hour++;
      }
    }
  }

  return events;
}

function seed(days = 7) {
  const db = getDb();

  db.exec("DELETE FROM events");
  db.exec("DELETE FROM workers");
  db.exec("DELETE FROM workstations");

  const insertStation = db.prepare(
    "INSERT OR REPLACE INTO workstations (station_id, name, type) VALUES (?, ?, ?)"
  );
  for (const s of WORKSTATIONS) {
    insertStation.run(s.station_id, s.name, s.type);
  }

  const insertWorker = db.prepare(
    "INSERT OR REPLACE INTO workers (worker_id, name, workstation_id) VALUES (?, ?, ?)"
  );
  for (const w of WORKERS) {
    insertWorker.run(w.worker_id, w.name, w.workstation_id);
  }

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO events (timestamp, worker_id, workstation_id, event_type, confidence, count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((events) => {
    for (const e of events) {
      insertEvent.run(e.timestamp, e.worker_id, e.workstation_id, e.event_type, e.confidence, e.count);
    }
  });

  const today = new Date();
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0];
    const events = generateEvents(dateStr);
    insertMany(events);
  }

  const totalEvents = db.prepare("SELECT COUNT(*) as count FROM events").get();
  console.log(`Seeded ${totalEvents.count} events across ${days} days`);
}

if (require.main === module) {
  seed();
  process.exit(0);
}

module.exports = { seed, WORKSTATIONS, WORKERS };
