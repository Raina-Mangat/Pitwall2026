import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE = 'https://pitwall2026.onrender.com';

export function useNextPrediction() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${BASE}/api/predictions/next`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useAccuracy() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${BASE}/api/accuracy`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export function useDriver(abbreviation) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!abbreviation) return;
    setLoading(true);
    axios.get(`${BASE}/api/drivers/${abbreviation}`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [abbreviation]);

  return { data, loading, error };
}

export function useRaces() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    axios.get(`${BASE}/api/races`)
      .then(r  => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}