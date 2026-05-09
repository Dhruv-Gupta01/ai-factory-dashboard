const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { getDb } = require("./db/init");
const { seed } = require("./db/seed");
const eventsRouter = require("./routes/events");
const metricsRouter = require("./routes/metrics");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.use("/api/events", eventsRouter);
app.use("/api/metrics", metricsRouter);

app.get("/api/workers", (req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM workers").all());
});

app.get("/api/workstations", (req, res) => {
  const db = getDb();
  res.json(db.prepare("SELECT * FROM workstations").all());
});

app.post("/api/seed", (req, res) => {
  const days = req.body.days || 7;
  try {
    seed(days);
    res.json({ message: `Database reseeded with ${days} days of data` });
  } catch (err) {
    res.status(500).json({ error: "Seeding failed", details: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

getDb();
seed();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
