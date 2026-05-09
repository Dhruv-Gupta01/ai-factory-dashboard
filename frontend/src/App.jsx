import React, { useState, useCallback } from "react";
import { useMetrics } from "./hooks/useMetrics";
import {
  getFactoryMetrics,
  getWorkerMetrics,
  getWorkstationMetrics,
  getWorkerDetail,
  getWorkstationDetail,
  reseedData,
} from "./api";
import FactorySummary from "./components/FactorySummary";
import WorkerTable from "./components/WorkerTable";
import WorkstationTable from "./components/WorkstationTable";
import DetailPanel from "./components/DetailPanel";

export default function App() {
  const [dateFilter, setDateFilter] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailType, setDetailType] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const factory = useMetrics(
    () => getFactoryMetrics(dateFilter),
    [dateFilter]
  );
  const workers = useMetrics(
    () => getWorkerMetrics(dateFilter),
    [dateFilter]
  );
  const workstations = useMetrics(
    () => getWorkstationMetrics(dateFilter),
    [dateFilter]
  );

  const handleWorkerSelect = useCallback(
    async (id) => {
      setSelectedWorker(id);
      setSelectedStation(null);
      const data = await getWorkerDetail(id, dateFilter);
      setDetail(data);
      setDetailType("worker");
    },
    [dateFilter]
  );

  const handleStationSelect = useCallback(
    async (id) => {
      setSelectedStation(id);
      setSelectedWorker(null);
      const data = await getWorkstationDetail(id, dateFilter);
      setDetail(data);
      setDetailType("workstation");
    },
    [dateFilter]
  );

  const handleCloseDetail = () => {
    setDetail(null);
    setDetailType(null);
    setSelectedWorker(null);
    setSelectedStation(null);
  };

  const handleReseed = async () => {
    setSeeding(true);
    try {
      await reseedData(7);
      factory.refresh();
      workers.refresh();
      workstations.refresh();
      handleCloseDetail();
    } finally {
      setSeeding(false);
    }
  };

  const loading = factory.loading || workers.loading || workstations.loading;
  const error = factory.error || workers.error || workstations.error;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Factory Productivity Dashboard
            </h1>
            <p className="text-sm text-gray-500">
              AI-powered worker monitoring &middot; Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
              placeholder="Filter by date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="rounded bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleReseed}
              disabled={seeding}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {seeding ? "Reseeding..." : "Reseed Data"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Error loading data: {error}
          </div>
        )}

        {loading && !factory.data ? (
          <div className="py-20 text-center text-gray-400">Loading dashboard...</div>
        ) : (
          <>
            <FactorySummary data={factory.data} />

            {detail && (
              <DetailPanel
                data={detail}
                type={detailType}
                onClose={handleCloseDetail}
              />
            )}

            <WorkerTable
              workers={workers.data}
              onSelect={handleWorkerSelect}
              selectedId={selectedWorker}
            />

            <WorkstationTable
              workstations={workstations.data}
              onSelect={handleStationSelect}
              selectedId={selectedStation}
            />
          </>
        )}
      </main>

      <footer className="border-t bg-white py-4 text-center text-xs text-gray-400">
        Shift: 9:00 AM - 5:00 PM &middot; Lunch: 1:00 PM - 2:00 PM &middot;
        Event interval: 15 minutes
      </footer>
    </div>
  );
}
