const http = require("http");

const API_URL = process.env.API_URL || "http://localhost:3001";
const INTERVAL_MS = process.env.INTERVAL_MS || 5000;
const SEED_ON_START = process.argv.includes("--seed");

const WORKERS = [
  { worker_id: "W1", workstation_id: "S1" },
  { worker_id: "W2", workstation_id: "S2" },
  { worker_id: "W3", workstation_id: "S3" },
  { worker_id: "W4", workstation_id: "S4" },
  { worker_id: "W5", workstation_id: "S5" },
  { worker_id: "W6", workstation_id: "S6" },
];

const EVENT_TYPES = ["working", "idle", "absent", "product_count"];

function randomEvent(worker) {
  const timestamp = new Date();

  const rand = Math.random();
  let eventType, count;

  if (rand < 0.6) {
    eventType = "working";
    count = Math.floor(Math.random() * 5) + 1;
  } else if (rand < 0.78) {
    eventType = "product_count";
    count = Math.floor(Math.random() * 8) + 1;
  } else if (rand < 0.92) {
    eventType = "idle";
    count = 0;
  } else {
    eventType = "absent";
    count = 0;
  }

  return {
    timestamp: timestamp.toISOString(),
    worker_id: worker.worker_id,
    workstation_id: worker.workstation_id,
    event_type: eventType,
    confidence: Math.round((0.75 + Math.random() * 0.24) * 100) / 100,
    count,
  };
}

function postEvents(events) {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/events/batch", API_URL);
    const data = JSON.stringify(events);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function postSeed() {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/seed", API_URL);
    const data = JSON.stringify({ days: 7 });

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      }
    );

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log(`Event Simulator started`);
  console.log(`API: ${API_URL}`);
  console.log(`Interval: ${INTERVAL_MS}ms`);

  // Health check HTTP server so Render can run this as a Web Service
  const PORT = process.env.PORT || 4000;
  http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", simulator: "running", api: API_URL }));
  }).listen(PORT, () => console.log(`Health server on port ${PORT}`));

  if (SEED_ON_START) {
    console.log("Seeding database...");
    try {
      const result = await postSeed();
      console.log("Seed result:", result);
    } catch (err) {
      console.error("Seed failed:", err.message);
    }
  }

  setInterval(async () => {
    const events = WORKERS.map(randomEvent);
    try {
      const result = await postEvents(events);
      console.log(
        `[${new Date().toISOString()}] Sent ${events.length} events — ingested: ${result.ingested}, duplicates: ${result.duplicates}`
      );
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Failed to send events:`, err.message);
    }
  }, Number(INTERVAL_MS));
}

run();
