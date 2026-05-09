# AI-Powered Worker Productivity Dashboard

A full-stack web application that ingests AI-generated CCTV events from a manufacturing factory and displays real-time productivity metrics for workers, workstations, and the factory as a whole.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  CCTV Cameras   │     │    Backend API    │     │    Frontend      │
│  (Simulator)    │────>│  (Node/Express)   │<────│  (React/Vite)    │
│                 │POST │                   │ GET │                  │
│ Generates events│/api │ Ingests, stores,  │/api │ Displays metrics │
│ every 15 min    │     │ computes metrics  │     │ Auto-polls 30s   │
└─────────────────┘     └────────┬─────────┘     └──────────────────┘
                                 │
                        ┌────────┴─────────┐
                        │     SQLite DB     │
                        │  workers,         │
                        │  workstations,    │
                        │  events           │
                        └──────────────────┘
```

### Data Flow
1. **Edge (Simulator)**: CV models on CCTV cameras produce structured events every 15 minutes per worker — classifying activity (working/idle/absent) or counting products.
2. **Backend**: Express API receives events via `POST /api/events`, validates, deduplicates (UNIQUE constraint on `worker_id, workstation_id, timestamp, event_type`), and persists to SQLite.
3. **Dashboard**: React frontend polls `GET /api/metrics/*` every 30 seconds, computing metrics on-the-fly via SQL aggregation queries.

## Quick Start

### With Docker (recommended)

```bash
docker-compose up --build
```

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/health

The database is pre-seeded with 7 days of dummy data on first start. The simulator begins pushing live events automatically.

### Without Docker

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Terminal 3 - Simulator (optional)
cd simulator
node index.js
```

## Database Schema

### workstations
| Column     | Type | Description          |
|------------|------|----------------------|
| station_id | TEXT | Primary key (S1-S6)  |
| name       | TEXT | Display name         |
| type       | TEXT | assembly, welding, etc. |

### workers
| Column         | Type | Description                    |
|----------------|------|--------------------------------|
| worker_id      | TEXT | Primary key (W1-W6)            |
| name           | TEXT | Display name                   |
| workstation_id | TEXT | FK to workstations (assigned)  |

### events
| Column         | Type    | Description                              |
|----------------|---------|------------------------------------------|
| id             | INTEGER | Auto-increment PK                        |
| timestamp      | TEXT    | ISO 8601 timestamp                       |
| worker_id      | TEXT    | FK to workers                            |
| workstation_id | TEXT    | FK to workstations                       |
| event_type     | TEXT    | working, idle, absent, product_count     |
| confidence     | REAL    | CV model confidence (0-1)                |
| count          | INTEGER | Units produced (0 for idle/absent)       |
| created_at     | TEXT    | Server ingestion timestamp               |

**Deduplication**: UNIQUE constraint on `(worker_id, workstation_id, timestamp, event_type)`. Duplicate events are silently ignored via `INSERT OR IGNORE`.

## API Endpoints

| Method | Endpoint                      | Description                        |
|--------|-------------------------------|------------------------------------|
| POST   | `/api/events`                 | Ingest a single event              |
| POST   | `/api/events/batch`           | Ingest multiple events             |
| GET    | `/api/events`                 | Query events (filterable)          |
| GET    | `/api/metrics/factory`        | Factory-level metrics              |
| GET    | `/api/metrics/workers`        | All workers with metrics           |
| GET    | `/api/metrics/workers/:id`    | Single worker detail + daily breakdown |
| GET    | `/api/metrics/workstations`   | All workstations with metrics      |
| GET    | `/api/metrics/workstations/:id` | Single workstation detail        |
| POST   | `/api/seed`                   | Reseed database with dummy data    |
| GET    | `/api/workers`                | List all workers                   |
| GET    | `/api/workstations`           | List all workstations              |

All metric endpoints accept optional query params: `?date=YYYY-MM-DD` or `?from=ISO&to=ISO`.

## Metric Definitions

### Worker-Level
| Metric              | Computation                                                      |
|---------------------|------------------------------------------------------------------|
| Active Time         | Count of intervals where `event_type` is `working` or `product_count`, multiplied by 15 minutes |
| Idle Time           | Count of `idle` intervals x 15 minutes                           |
| Utilization %       | `active_time / (days_worked x 7 hours x 60 minutes) x 100`      |
| Total Units         | `SUM(count)` across all event types for the worker               |
| Units per Hour      | `total_units / active_hours`                                     |

### Workstation-Level
| Metric              | Computation                                                      |
|---------------------|------------------------------------------------------------------|
| Occupancy Time      | Count of `working` or `product_count` intervals x 15 minutes     |
| Utilization %       | `occupancy_time / (days_active x 7 hours x 60 minutes) x 100`   |
| Total Units         | `SUM(count)` across all events at this workstation               |
| Throughput Rate     | `total_units / occupancy_hours`                                  |

### Factory-Level
| Metric              | Computation                                                      |
|---------------------|------------------------------------------------------------------|
| Total Productive Time | Sum of all active intervals across all workers x 15 minutes    |
| Total Production    | `SUM(count)` across all events                                   |
| Avg Production Rate | `total_units / total_productive_hours`                           |
| Avg Utilization     | Average of all individual worker utilization percentages         |

## Assumptions and Tradeoffs

### Time Model
- **Fixed 15-minute intervals**: Each event represents the worker's state for the preceding 15 minutes. An event at 10:15 means the worker was in that state from 10:00-10:15.
- **Shift**: 9:00 AM to 5:00 PM (8 hours), with lunch from 1:00 PM to 2:00 PM (excluded). Effective shift = 7 hours = 28 intervals.
- **Guaranteed events**: We assume the CV system sends exactly one event per worker per interval. No gaps.

### Event Types
- `working` and `product_count` are both treated as "active" for utilization calculations.
- `working` events may have `count > 0` (units produced while working).
- `product_count` events are dedicated production output events from the product-counting CV model, always with `count > 0`.
- For a given interval, a worker has exactly one event (mutually exclusive).
- `count` is incremental — units produced in that specific 15-minute interval, not cumulative.

### Compute Strategy
- **Query-time aggregation**: Metrics are computed on-the-fly via SQL queries. No pre-aggregated tables.
- **Why**: At this scale (6 workers x 28 intervals/day = ~168 events/day), SQL handles aggregation in milliseconds. Pre-aggregation adds complexity and staleness without measurable benefit.

### Worker-Workstation Mapping
- Each worker is assigned to one workstation (stored in the `workers` table).
- A workstation can have multiple workers assigned.
- The assignment is a configuration-level relationship. Events track which workstation a worker was actually at.

## Handling Edge Cases

### Intermittent Connectivity
- Events from cameras may arrive late due to network issues.
- The backend accepts events regardless of timestamp ordering — they're inserted into the database and aggregated by timestamp at query time.
- The `created_at` field tracks when the server actually received the event, separate from the event's own `timestamp`.
- **At scale**: Implement a local buffer on edge devices (cameras) that queues events and retries with exponential backoff when the backend is unreachable. Use idempotent inserts so replayed events are safely deduplicated.

### Duplicate Events
- The UNIQUE constraint on `(worker_id, workstation_id, timestamp, event_type)` prevents duplicate storage.
- `INSERT OR IGNORE` silently drops duplicates — the API returns `{ duplicate: true }` for single events.
- Batch ingestion reports counts: `{ ingested: N, duplicates: M, errors: [...] }`.

### Out-of-Order Timestamps
- Events are stored by their original timestamp, not arrival order.
- All metric queries use `ORDER BY timestamp` or aggregate by date — insertion order is irrelevant.
- No event depends on having seen the "previous" event; each is self-contained.

## Theoretical: Model Versioning

To track which CV model version produced each event:

1. **Add `model_version` to the events table**: `ALTER TABLE events ADD COLUMN model_version TEXT`.
2. **Include in API contract**: The camera system sends `"model_version": "yolov8-2.1"` with each event.
3. **Version registry**: Maintain a `model_versions` table tracking version, release date, training data hash, and accuracy benchmarks.
4. **Query by version**: Allow metric filtering by model version to compare accuracy across versions (e.g., "did v2.1 count more accurately than v2.0?").

## Theoretical: Detecting Model Drift

Model drift occurs when the CV model's real-world accuracy degrades over time (e.g., lighting changes, new product types, camera repositioning).

**Detection strategies:**
1. **Confidence score monitoring**: Track average confidence per model version over time. A sustained drop (e.g., rolling 24h average below threshold) signals drift.
2. **Anomaly detection on output distribution**: If the ratio of event types shifts significantly (e.g., suddenly 50% `absent` when historically 7%), flag for review.
3. **Ground truth sampling**: Periodically sample events and have humans verify (was the worker really idle?). Compare human labels to model predictions to measure real accuracy.
4. **Cross-model validation**: Run two model versions in parallel. Disagreement rate above a threshold triggers investigation.

**Triggering retraining:**
- Set alerting thresholds on confidence trends (e.g., 7-day rolling average drops below 0.8).
- Accumulate human-verified labels as retraining data.
- Automate retraining pipeline: drift detected -> collect labels -> retrain -> A/B test -> deploy.

## Theoretical: Scaling

### 5 cameras (current)
- Single SQLite database, single backend instance.
- Query-time aggregation is sufficient.
- Everything runs on one machine.

### 100+ cameras
- **Database**: Migrate from SQLite to PostgreSQL for concurrent writes.
- **Backend**: Run multiple API instances behind a load balancer (nginx/HAProxy).
- **Event ingestion**: Add a message queue (RabbitMQ/Kafka) between cameras and the API to handle burst traffic and decouple ingestion from processing.
- **Pre-aggregation**: Introduce materialized views or a cron job that rolls up events into hourly/daily summary tables. Dashboard reads from summaries instead of scanning raw events.
- **Caching**: Add Redis for frequently accessed metrics (factory summary, current shift data).

### Multi-site
- **Database per site** or a single database with a `factory_id` column added to all tables.
- **Regional backend instances**: Each factory site has a local API server for low-latency ingestion.
- **Central aggregation**: A separate service syncs metrics from all sites to a central database for global dashboards.
- **Hierarchical metrics**: Factory -> Site -> Region -> Global rollups.
- **Data partitioning**: Partition the events table by `factory_id` and date for query performance.
- **Edge computing**: Run lightweight inference on-site, send only structured events (not video) to reduce bandwidth.

## Tech Stack

| Component  | Technology                    |
|------------|-------------------------------|
| Backend    | Node.js, Express              |
| Database   | SQLite (better-sqlite3)       |
| Frontend   | React, Vite, Tailwind CSS     |
| Charts     | Recharts                      |
| Simulator  | Node.js (native http)         |
| Container  | Docker, Docker Compose        |
| Proxy      | Nginx (in production Docker)  |
