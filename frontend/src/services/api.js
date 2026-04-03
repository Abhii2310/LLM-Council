import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000",
  timeout: 60000,
});

export async function evaluateQuery(query) {
  const res = await api.post("/evaluate", { query });
  return res.data;
}

export async function submitQuery(query) {
  return evaluateQuery(query);
}

export async function fetchHistory(limit = 20) {
  const res = await api.get("/history", { params: { limit } });
  return res.data?.items || [];
}
