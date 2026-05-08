import axios from "axios";

const backendBaseUrl =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: backendBaseUrl,
  timeout: 60000,
});

function getSessionId() {
  const key = "llm_council_session_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const generated = typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(key, generated);
  return generated;
}

export async function evaluateQuery(query, options = {}) {
  const res = await api.post("/evaluate", {
    query,
    session_id: getSessionId(),
    reasoning_mode: options?.reasoningMode || "standard",
    enable_web_search: Boolean(options?.enableWebSearch),
  });
  return res.data;
}

export async function submitQuery(query) {
  return evaluateQuery(query);
}

export async function fetchHistory(limit = 20) {
  const res = await api.get("/history", { params: { limit, session_id: getSessionId() } });
  return res.data?.items || [];
}

export async function submitFeedback(payload) {
  const res = await api.post("/feedback", {
    query: payload?.query || "",
    session_id: getSessionId(),
    best_model: payload?.best_model || "",
    selected_model: payload?.selected_model || "",
    is_positive: Boolean(payload?.is_positive),
    note: payload?.note || "",
  });
  return res.data;
}

export async function fetchFeedbackInsights(limit = 200) {
  const res = await api.get("/feedback/insights", { params: { limit } });
  return res.data;
}

export async function fetchReliabilityInsights(limit = 120) {
  const res = await api.get("/reliability/insights", { params: { limit } });
  return res.data;
}

export async function fetchProviderHealthCheck() {
  const res = await api.get("/providers/health-check");
  return res.data;
}

export async function fetchQuantumStatus() {
  const res = await api.get("/quantum/status");
  return res.data;
}
