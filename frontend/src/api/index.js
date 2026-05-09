const API_BASE = "/api";

async function fetchJson(url) {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getFactoryMetrics(date) {
  const params = date ? `?date=${date}` : "";
  return fetchJson(`/metrics/factory${params}`);
}

export function getWorkerMetrics(date) {
  const params = date ? `?date=${date}` : "";
  return fetchJson(`/metrics/workers${params}`);
}

export function getWorkerDetail(id, date) {
  const params = date ? `?date=${date}` : "";
  return fetchJson(`/metrics/workers/${id}${params}`);
}

export function getWorkstationMetrics(date) {
  const params = date ? `?date=${date}` : "";
  return fetchJson(`/metrics/workstations${params}`);
}

export function getWorkstationDetail(id, date) {
  const params = date ? `?date=${date}` : "";
  return fetchJson(`/metrics/workstations/${id}${params}`);
}

export async function reseedData(days = 7) {
  const res = await fetch(`${API_BASE}/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ days }),
  });
  return res.json();
}
