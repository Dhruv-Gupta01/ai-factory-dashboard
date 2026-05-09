import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL = 30000;

export function useMetrics(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  return { data, loading, error, refresh: load };
}
