import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Clock, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NeuralBackground from "../components/ui/flow-field-background";

import QueryInput from "../components/QueryInput";
import CouncilResponses from "../components/CouncilResponses";
import LoadingCouncil from "../components/LoadingCouncil";
import MetricsDashboard from "../components/MetricsDashboard";
import MetricsExplainer from "../components/MetricsExplainer";
import BestResponsePanel from "../components/BestResponsePanel";
import ComparisonPanel from "../components/ComparisonPanel";
import EvaluationHistoryPanel from "../components/EvaluationHistoryPanel";
import FinalDecisionPanel from "../components/FinalDecisionPanel";
import RuixenMoonChat from "../components/ui/ruixen-moon-chat";
import {
  evaluateQuery,
  fetchHistory,
  fetchFeedbackInsights,
  fetchReliabilityInsights,
  fetchProviderHealthCheck,
  fetchQuantumStatus,
  submitFeedback,
} from "../services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const WORKING_MODEL_KEYS = [
  "llama3_70b",
  "llama4_scout",
  "llama3_8b",
  "cerebras_llama3_70b",
  "nvidia_llama",
  "aimlapi_mistral",
];

const COMING_SOON_MODEL_KEYS = [
  "kimi_k2",
  "deepseek_chat",
  "cohere_command_r",
  "sambanova_qwen",
  "together_qwen",
  "ollama_local",
];

const ALL_MODEL_KEYS = [...WORKING_MODEL_KEYS, ...COMING_SOON_MODEL_KEYS];

const MODEL_LABELS = {
  llama3_70b: "Llama 3.3 70B",
  llama4_scout: "Llama 4 Scout 17B",
  llama3_8b: "Llama 3.1 8B",
  cerebras_llama3_70b: "Cerebras Llama 3.1 70B",
  nvidia_llama: "NVIDIA Llama 3.1 Nemotron 70B",
  aimlapi_mistral: "AI/ML API Mistral Small",
  kimi_k2: "Kimi K2",
  deepseek_chat: "DeepSeek Chat",
  cohere_command_r: "Cohere Command R",
  sambanova_qwen: "SambaNova Qwen 2.5 72B",
  together_qwen: "Together Qwen 2.5 72B",
  ollama_local: "Ollama Local",
};

const getModelLabel = (model) => MODEL_LABELS[model] || model;

export default function Dashboard() {
  const navigate = useNavigate();
  const [uiMode, setUiMode] = useState(() => localStorage.getItem("llm_council_ui_mode") || "developer");
  const [queryDraft, setQueryDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [history, setHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [queryOptions, setQueryOptions] = useState({ reasoningMode: "standard", enableWebSearch: false });
  const [feedbackState, setFeedbackState] = useState("idle");
  const [answerView, setAnswerView] = useState(null);
  const [feedbackInsights, setFeedbackInsights] = useState({
    total_feedback: 0,
    positive_feedback: 0,
    negative_feedback: 0,
    models: [],
    trend_points: [],
  });
  const [reliabilityInsights, setReliabilityInsights] = useState({
    window_evaluations: 0,
    summary: {
      total_slots: 0,
      successful_slots: 0,
      failed_slots: 0,
      success_rate: 0,
      avg_latency_ms: 0,
    },
    models: [],
  });
  const [providerHealth, setProviderHealth] = useState(null);
  const [providerHealthLoading, setProviderHealthLoading] = useState(false);
  const [providerHealthError, setProviderHealthError] = useState("");
  const [providerHealthAutoRefresh, setProviderHealthAutoRefresh] = useState(false);
  const [quantumStatus, setQuantumStatus] = useState(null);
  const [compactFlow, setCompactFlow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1536 : false
  );
  const [activePanel, setActivePanel] = useState("query");
  const [panelPinnedByUser, setPanelPinnedByUser] = useState(false);
  const timerRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const items = await fetchHistory(20);
      setHistory(items || []);
    } catch {
      setHistory([]);
    }
  }, []);

  const loadQuantumStatus = useCallback(async () => {
    try {
      const status = await fetchQuantumStatus();
      setQuantumStatus(status || null);
    } catch {
      setQuantumStatus(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 1535px)");
    const apply = (matches) => {
      setCompactFlow(matches);
      if (!matches) {
        setActivePanel("query");
        setPanelPinnedByUser(false);
      } else if (data || error || loading) {
        setActivePanel("answers");
        setPanelPinnedByUser(false);
      }
    };
    apply(media.matches);
    const handler = (event) => apply(event.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, [data, error, loading]);

  useEffect(() => {
    if (!compactFlow) return;
    if (!panelPinnedByUser && (loading || data || error)) {
      setActivePanel("answers");
    }
  }, [compactFlow, data, error, loading, panelPinnedByUser]);

  const runProviderHealthCheck = useCallback(async () => {
    setProviderHealthLoading(true);
    setProviderHealthError("");
    try {
      const snapshot = await fetchProviderHealthCheck();
      setProviderHealth(snapshot || null);
    } catch (e) {
      setProviderHealth(null);
      setProviderHealthError(e?.response?.data?.detail || e?.message || "Health check failed");
    } finally {
      setProviderHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (uiMode !== "developer" || !providerHealthAutoRefresh) return undefined;

    runProviderHealthCheck();
    const id = setInterval(() => {
      runProviderHealthCheck();
    }, 30000);

    return () => clearInterval(id);
  }, [providerHealthAutoRefresh, runProviderHealthCheck, uiMode]);

  useEffect(() => {
    if (uiMode !== "developer") return;
    if (!providerHealth && !providerHealthLoading) {
      runProviderHealthCheck();
    }
    if (!quantumStatus) {
      loadQuantumStatus();
    }
  }, [loadQuantumStatus, providerHealth, providerHealthLoading, quantumStatus, runProviderHealthCheck, uiMode]);

  const loadReliabilityInsights = useCallback(async () => {
    try {
      const insights = await fetchReliabilityInsights(120);
      setReliabilityInsights(
        insights || {
          window_evaluations: 0,
          summary: {
            total_slots: 0,
            successful_slots: 0,
            failed_slots: 0,
            success_rate: 0,
            avg_latency_ms: 0,
          },
          models: [],
        }
      );
    } catch {
      setReliabilityInsights({
        window_evaluations: 0,
        summary: {
          total_slots: 0,
          successful_slots: 0,
          failed_slots: 0,
          success_rate: 0,
          avg_latency_ms: 0,
        },
        models: [],
      });
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadFeedbackInsights = useCallback(async () => {
    try {
      const insights = await fetchFeedbackInsights(200);
      setFeedbackInsights(
        insights || {
          total_feedback: 0,
          positive_feedback: 0,
          negative_feedback: 0,
          models: [],
          trend_points: [],
        }
      );
    } catch {
      setFeedbackInsights({
        total_feedback: 0,
        positive_feedback: 0,
        negative_feedback: 0,
        models: [],
        trend_points: [],
      });
    }
  }, []);

  const trendPath = useMemo(() => {
    const pts = Array.isArray(feedbackInsights?.trend_points) ? feedbackInsights.trend_points : [];
    if (pts.length < 2) return "";
    const width = 280;
    const height = 52;
    return pts
      .map((v, i) => {
        const x = (i / (pts.length - 1)) * width;
        const y = height - Number(v || 0) * height;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [feedbackInsights?.trend_points]);

  const trainingHealth = useMemo(() => {
    const total = Number(feedbackInsights?.total_feedback || 0);
    const up = Number(feedbackInsights?.positive_feedback || 0);
    if (!total) return 0;
    return Math.round((up / total) * 100);
  }, [feedbackInsights?.positive_feedback, feedbackInsights?.total_feedback]);

  const trainingCoverage = useMemo(() => {
    const trainedModels = Array.isArray(feedbackInsights?.models)
      ? feedbackInsights.models.filter((m) => Number(m?.total || 0) > 0).length
      : 0;
    if (!ALL_MODEL_KEYS.length) return 0;
    return Math.round((trainedModels / ALL_MODEL_KEYS.length) * 100);
  }, [feedbackInsights?.models]);

  useEffect(() => {
    loadFeedbackInsights();
  }, [loadFeedbackInsights]);

  useEffect(() => {
    loadReliabilityInsights();
  }, [loadReliabilityInsights]);

  useEffect(() => {
    localStorage.setItem("llm_council_ui_mode", uiMode);
  }, [uiMode]);

  const onSubmit = useCallback(async (query, options = {}) => {
    const q = (query || "").trim();
    if (!q) return;

    const runOptions = {
      reasoningMode: uiMode === "user" ? (options?.reasoningMode || queryOptions.reasoningMode || "standard") : "standard",
      enableWebSearch: uiMode === "user" ? Boolean(options?.enableWebSearch ?? queryOptions.enableWebSearch) : false,
    };

    if (uiMode === "user") {
      setChatMessages((prev) => [
        ...prev,
        { id: `user_${Date.now()}_${prev.length}`, role: "user", content: q },
      ]);
    }

    setLoading(true);
    setError(null);
    setElapsed(null);
    setFeedbackState("idle");
    setAnswerView(null);
    if (compactFlow) {
      setPanelPinnedByUser(false);
      setActivePanel("answers");
    }
    const start = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(((Date.now() - start) / 1000).toFixed(1));
    }, 100);

    try {
      const res = await evaluateQuery(q, runOptions);
      setData(res);
      const baseScore = Number((res?.scores || []).find((s) => s.model === res?.best_model)?.final_score ?? 0);
      setAnswerView({
        model: res?.best_model || "",
        response: res?.best_response || "",
        reason: res?.reason || "",
        score: Number.isFinite(baseScore) ? baseScore : null,
        title: "🏆 Best Response Selected",
        isAlternate: false,
      });

      if (uiMode === "user") {
        const assistantResponse =
          res?.final_decision_winner_response ||
          res?.best_response ||
          "I couldn't generate a response for that request.";
        const assistantModel = res?.final_decision_winner || res?.best_model || "assistant";
        const successModels = (res?.responses || [])
          .filter((r) => !r?.error && String(r?.response || "").trim())
          .map((r) => r.model);
        const unavailableModels = (res?.responses || []).filter((r) => r?.error).map((r) => r.model);
        const webResearchSources = (res?.web_research_sources || []).slice(0, 3);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `assistant_${Date.now()}_${prev.length}`,
            role: "assistant",
            content: assistantResponse,
            model: assistantModel,
            bestModel: res?.best_model || "",
            secondBestModel: res?.second_best_model || "",
            secondBestResponse: res?.second_best_response || "",
            secondBestScore: Number(res?.second_best_score || 0),
            modelsUsed: successModels,
            unavailableModels,
            webResearchUsed: Boolean(res?.web_research_used),
            webResearchNote: res?.web_research_note || "",
            webResearchSources,
          },
        ]);
      }

      await loadHistory();
      await loadReliabilityInsights();
      await loadQuantumStatus();
    } catch (e) {
      setError(e?.response?.data || e?.message || "Request failed");
      setData(null);
      setAnswerView(null);

      if (uiMode === "user") {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `assistant_error_${Date.now()}_${prev.length}`,
            role: "assistant",
            content: "I hit an error while processing that. Please try again.",
            model: "system",
          },
        ]);
      }
    } finally {
      clearInterval(timerRef.current);
      setElapsed(((Date.now() - start) / 1000).toFixed(1));
      setLoading(false);
    }
  }, [compactFlow, loadHistory, loadQuantumStatus, loadReliabilityInsights, queryOptions.enableWebSearch, queryOptions.reasoningMode, uiMode]);

  const lastAssistantMessage = useMemo(() => {
    for (let i = (chatMessages?.length || 0) - 1; i >= 0; i -= 1) {
      if (chatMessages[i]?.role === "assistant") return chatMessages[i];
    }
    return null;
  }, [chatMessages]);

  const onThumbsUp = useCallback(async () => {
    if (!data) return;
    const selectedModel = uiMode === "user"
      ? (lastAssistantMessage?.model || data.best_model)
      : (answerView?.model || data.best_model);
    setFeedbackState("sending");
    try {
      await submitFeedback({
        query: data.query,
        best_model: data.best_model,
        selected_model: selectedModel,
        is_positive: true,
        note: uiMode === "user" ? "thumbs_up_user_mode" : "thumbs_up",
      });
      setFeedbackState("sent_up");
      await loadFeedbackInsights();
    } catch {
      setFeedbackState("error");
    }
  }, [answerView?.model, data, lastAssistantMessage?.model, loadFeedbackInsights, uiMode]);

  const onThumbsDown = useCallback(async () => {
    if (!data) return;

    const hasAlternate = Boolean(data?.second_best_model && data?.second_best_response);
    if (hasAlternate) {
      setAnswerView({
        model: data.second_best_model,
        response: data.second_best_response,
        reason: `Alternate candidate selected from next-best score (${Number(data.second_best_score || 0).toFixed(4)}).`,
        score: Number(data.second_best_score || 0),
        title: "↪ Alternate Response (2nd Best)",
        isAlternate: true,
      });

      if (uiMode === "user") {
        setChatMessages((prev) => {
          const idx = [...prev].reverse().findIndex((m) => m?.role === "assistant");
          if (idx < 0) return prev;
          const at = prev.length - 1 - idx;
          const next = [...prev];
          next[at] = {
            ...next[at],
            content: data.second_best_response,
            model: data.second_best_model,
            isAlternate: true,
          };
          return next;
        });
      }
    }

    setFeedbackState("sending");
    try {
      await submitFeedback({
        query: data.query,
        best_model: data.best_model,
        selected_model: data.best_model,
        is_positive: false,
        note: hasAlternate ? "thumbs_down_alternate_shown" : "thumbs_down",
      });
      setFeedbackState("sent_down");
      await loadFeedbackInsights();
    } catch {
      setFeedbackState("error");
    }
  }, [data, loadFeedbackInsights, uiMode]);

  const successCount = data?.responses?.filter((r) => !r.error).length || 0;
  const successfulModels = useMemo(
    () => new Set((data?.responses || []).filter((r) => !r?.error && String(r?.response || "").trim()).map((r) => r.model)),
    [data?.responses]
  );
  const metricsForView = useMemo(
    () => (data?.metrics || []).filter((m) => successfulModels.has(m.model)),
    [data?.metrics, successfulModels]
  );
  const scoresForView = useMemo(
    () => (data?.scores || []).filter((s) => successfulModels.has(s.model)),
    [data?.scores, successfulModels]
  );
  const unavailableModels = useMemo(
    () => (data?.responses || []).filter((r) => r?.error).map((r) => r.model),
    [data?.responses]
  );
  const providerHealthByModel = useMemo(() => {
    const entries = (providerHealth?.models || []).map((row) => [row.model, row]);
    return new Map(entries);
  }, [providerHealth?.models]);
  const unavailableModelLabels = useMemo(
    () => unavailableModels.map((m) => getModelLabel(m)),
    [unavailableModels]
  );
  const bestScore = useMemo(() => {
    const modelKey = answerView?.model || data?.best_model;
    if (!data?.scores?.length || !modelKey) return null;
    const row = data.scores.find((s) => s.model === modelKey);
    return row ? Number(row.final_score) : null;
  }, [answerView?.model, data]);
  const quantumMeta = data?.quantum_metadata || {};
  const quantumWinner = data?.quantum_selected_model || data?.best_model || "";
  const quantumWinnerScore = Number(
    data?.quantum_selected_score
      ?? (data?.scores || []).find((s) => s.model === quantumWinner)?.final_score
      ?? 0
  );
  const modelChipClass = useCallback((model, fallbackTone) => {
    const status = providerHealthByModel.get(model)?.status;
    if (status === "ok") {
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200/90";
    }
    if (status === "blocked") {
      return "border-amber-500/20 bg-amber-500/10 text-amber-100/90";
    }
    return fallbackTone;
  }, [providerHealthByModel]);

  if (uiMode === "user") {
    return (
      <RuixenMoonChat
        mode={uiMode}
        onModeChange={setUiMode}
        onGoHome={() => navigate("/")}
        onSubmit={onSubmit}
        onHistorySelect={onSubmit}
        queryOptions={queryOptions}
        onQueryOptionsChange={setQueryOptions}
        loading={loading}
        elapsed={elapsed}
        history={history}
        messages={chatMessages}
        onThumbsUp={onThumbsUp}
        onThumbsDown={onThumbsDown}
        feedbackState={feedbackState}
        canFeedback={Boolean(lastAssistantMessage && !loading && data)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">VeriDict AI</h1>
              <p className="text-xs text-white/40">Reliable Multi-Model AI Decision Engine</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
              <button
                onClick={() => setUiMode("developer")}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${uiMode === "developer" ? "bg-indigo-500/30 text-indigo-100" : "text-white/55 hover:text-white"}`}
              >
                Developer Mode
              </button>
              <button
                onClick={() => setUiMode("user")}
                className={`rounded-lg px-3 py-1.5 text-xs transition ${uiMode === "user" ? "bg-emerald-500/30 text-emerald-100" : "text-white/55 hover:text-white"}`}
              >
                User Mode
              </button>
            </div>

            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm text-white/70 hover:text-white"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            <Activity className="h-3 w-3" /> Multi-Provider Council
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">Active now</span>
            {WORKING_MODEL_KEYS.map((model) => (
              <span key={model} className={`rounded-full border px-2 py-1 text-[11px] ${modelChipClass(model, "border-emerald-500/20 bg-emerald-500/10 text-emerald-200/90")}`}>
                {getModelLabel(model)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">Coming soon</span>
            {COMING_SOON_MODEL_KEYS.map((model) => (
              <span key={model} className={`rounded-full border px-2 py-1 text-[11px] ${modelChipClass(model, "border-white/10 bg-white/5 text-white/70")}`}>
                {getModelLabel(model)}
              </span>
            ))}
          </div>
          {elapsed && !loading ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <Clock className="h-3 w-3" /> {elapsed}s
            </span>
          ) : null}
          {unavailableModels.length ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100/90">
              Temporarily unavailable: {unavailableModelLabels.join(" • ")}
            </span>
          ) : null}
        </div>
      </motion.div>

      {compactFlow ? (
        <div className="mb-5 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => {
              setActivePanel("query");
              setPanelPinnedByUser(true);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${activePanel === "query" ? "bg-indigo-500/25 text-indigo-100" : "text-white/60 hover:text-white"}`}
          >
            Query Panel
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePanel("answers");
              setPanelPinnedByUser(true);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${activePanel === "answers" ? "bg-emerald-500/25 text-emerald-100" : "text-white/60 hover:text-white"}`}
          >
            Answers Panel
          </button>
        </div>
      ) : null}

      <div className={compactFlow
        ? "grid items-start gap-6"
        : "grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"}
      >
        {/* Left sidebar */}
        {!compactFlow || activePanel === "query" ? (
        <div className="relative z-20 grid min-w-0 gap-6 content-start">
          <QueryInput
            onSubmit={onSubmit}
            loading={loading}
            value={queryDraft}
            onValueChange={setQueryDraft}
          />

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : data ? "bg-emerald-400" : "bg-white/30"}`} />
                System Status
              </CardTitle>
              <CardDescription>Backend connectivity and request state.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50">State</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${loading ? "bg-amber-500/15 text-amber-300" : data ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                    {loading ? "Processing..." : data ? "Ready" : "Idle"}
                  </span>
                </div>
                {loading && elapsed ? (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Elapsed</span>
                    <span className="font-mono text-xs text-amber-300">{elapsed}s</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Last Query</span>
                  <span className="max-w-[200px] truncate text-xs text-white/70">{data?.query || "—"}</span>
                </div>
                {data ? (
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Models OK</span>
                    <span className="text-xs text-emerald-300">{successCount}/{data.responses?.length || 0}</span>
                  </div>
                ) : null}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={runProviderHealthCheck}
                    disabled={providerHealthLoading}
                    className="w-full rounded-md border border-indigo-400/25 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-100 hover:bg-indigo-500/15 disabled:opacity-60"
                  >
                    {providerHealthLoading ? "Running Provider Health Check..." : "Run Provider Health Check"}
                  </button>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={providerHealthAutoRefresh}
                    onChange={(e) => setProviderHealthAutoRefresh(Boolean(e.target.checked))}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-black/30"
                  />
                  Auto-refresh every 30s
                </label>
                {providerHealthError ? (
                  <div className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-200/90">
                    {providerHealthError}
                  </div>
                ) : null}
                {providerHealth?.summary ? (
                  <div className="rounded-md border border-white/10 bg-black/25 p-2 text-[11px] text-white/75 space-y-1">
                    <div>
                      Healthy models: <span className="text-emerald-300">{Number(providerHealth.summary.healthy_models || 0)}</span>
                      <span className="text-white/40"> / {Number(providerHealth.summary.total_models || 0)}</span>
                    </div>
                    <div>
                      Blocked models: <span className="text-amber-300">{Number(providerHealth.summary.blocked_models || 0)}</span>
                    </div>
                    <div>
                      Gemini status: <span className={providerHealth?.gemini_status?.status === "ok" ? "text-emerald-300" : "text-amber-300"}>{providerHealth?.gemini_status?.status || "unknown"}</span>
                    </div>
                  </div>
                ) : null}
                {quantumStatus ? (
                  <div className="rounded-md border border-cyan-500/20 bg-cyan-500/10 p-2 text-[11px] text-cyan-100/85 space-y-1">
                    <div>
                      Quantum layer: <span className={quantumStatus.enabled ? "text-emerald-300" : "text-white/70"}>{quantumStatus.enabled ? "enabled" : "disabled"}</span>
                    </div>
                    <div>
                      Mode: <span className="text-cyan-200">{quantumStatus.mode || "off"}</span> • Backend: <span className="text-cyan-200">{quantumStatus.backend || "local"}</span>
                    </div>
                    <div>
                      Strength: <span className="text-cyan-200">{Number(quantumStatus.strength || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ) : null}
                {Array.isArray(providerHealth?.models) && providerHealth.models.some((m) => m.status !== "ok") ? (
                  <div className="space-y-1">
                    {providerHealth.models
                      .filter((m) => m.status !== "ok")
                      .slice(0, 12)
                      .map((m, index) => (
                        <div key={`${m.model}_${m.provider_model || "provider"}_${index}`} className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[10px]">
                          <div className="text-amber-100">{getModelLabel(m.model)} · {m.blocker_code || "provider_error"}</div>
                          <div className="text-amber-200/75 truncate" title={m.blocker_message}>{m.blocker_message || "Unknown blocker"}</div>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reliability Monitor</CardTitle>
              <CardDescription>Live model uptime and speed from recent evaluation windows.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="text-white/45">Window</div>
                    <div className="mt-1 text-sm font-semibold text-white/90">{Number(reliabilityInsights?.window_evaluations || 0)}</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
                    <div className="text-emerald-200/70">Success</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-200">
                      {Number(reliabilityInsights?.summary?.success_rate || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2">
                    <div className="text-sky-200/70">Latency</div>
                    <div className="mt-1 text-sm font-semibold text-sky-200">
                      {Number(reliabilityInsights?.summary?.avg_latency_ms || 0).toFixed(1)} ms
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {(reliabilityInsights?.models || []).slice(0, 8).map((row) => (
                    <div key={row.model} className="rounded-lg border border-white/10 bg-black/20 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-white/80">{row.model}</span>
                        <span className={`text-[10px] ${Number(row.success_rate || 0) >= 80 ? "text-emerald-300" : "text-amber-300"}`}>
                          {Number(row.success_rate || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-white/45">
                        ok {Number(row.success || 0)} • fail {Number(row.fail || 0)} • {Number(row.avg_latency_ms || 0).toFixed(1)} ms
                      </div>
                      {row.top_failure_reason ? (
                        <div className="mt-1 text-[10px] text-amber-200/75 truncate" title={row.top_failure_reason}>
                          top issue: {row.top_failure_reason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {(reliabilityInsights?.models || []).length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-white/45">
                      Run a few evaluations to populate reliability stats.
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation History */}
          <EvaluationHistoryPanel items={history} onResubmit={onSubmit} />

          <Card>
            <CardHeader>
              <CardTitle>Learning Insights</CardTitle>
              <CardDescription>Live training dashboard from thumbs feedback and model bias adaptation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="text-white/45">Total</div>
                    <div className="mt-1 text-sm font-semibold text-white/90">{feedbackInsights.total_feedback || 0}</div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
                    <div className="text-emerald-200/70">Up</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-200">{feedbackInsights.positive_feedback || 0}</div>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
                    <div className="text-amber-200/70">Down</div>
                    <div className="mt-1 text-sm font-semibold text-amber-200">{feedbackInsights.negative_feedback || 0}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
                    <div className="flex items-center justify-between text-[10px] text-emerald-100/75">
                      <span>Training quality</span>
                      <span>{trainingHealth}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
                      <div className="h-full bg-emerald-400/80" style={{ width: `${trainingHealth}%` }} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2">
                    <div className="flex items-center justify-between text-[10px] text-indigo-100/75">
                      <span>Model coverage</span>
                      <span>{trainingCoverage}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-indigo-950/60 overflow-hidden">
                      <div className="h-full bg-indigo-300/80" style={{ width: `${trainingCoverage}%` }} />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-white/55">Feedback Momentum</span>
                    <span className="text-[10px] text-white/40">recent events</span>
                  </div>
                  {trendPath ? (
                    <svg viewBox="0 0 280 52" className="h-12 w-full">
                      <path d={trendPath} fill="none" stroke="rgba(96,165,250,0.95)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <div className="h-12 rounded border border-dashed border-white/10 grid place-items-center text-[10px] text-white/35">
                      Not enough feedback points yet
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {(feedbackInsights.models || []).slice(0, 6).map((row) => (
                    <div key={row.model} className="rounded-lg border border-white/10 bg-black/20 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-white/80">{row.model}</span>
                        <span className={`text-[10px] ${Number(row.bias || 0) >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                          bias {Number(row.bias || 0).toFixed(4)}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-white/45">
                        👍 {Number(row.up || 0)} • 👎 {Number(row.down || 0)} • total {Number(row.total || 0)}
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full ${Number(row.bias || 0) >= 0 ? "bg-emerald-400/80" : "bg-amber-400/80"}`}
                            style={{ width: `${Math.min(100, Math.abs(Number(row.bias || 0)) / 0.03 * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(feedbackInsights.models || []).length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-white/45">
                      No feedback yet. Use thumbs on responses to start training signal.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/65 leading-5">
                  <span className="text-white/80 font-medium">How training works:</span> every thumbs event is saved, model-level up/down ratios create a small bounded bias, and that bias nudges future model ranking while keeping scoring stable.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested prompts (only when idle) */}
          <AnimatePresence>
            {!data && !loading && !error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Try these prompts</CardTitle>
                    <CardDescription>Click any prompt to auto-fill the query box.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {[
                        "Explain RAG vs fine-tuning with pros, cons, and 2 use-cases each.",
                        "What are the 5 key risks of multi-LLM systems and how to mitigate them?",
                        "Design an evaluation plan to reduce hallucinations in a multi-agent system.",
                      ].map((p) => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setQueryDraft(p)}
                          className="w-full rounded-lg border border-white/5 bg-black/20 p-3 text-left text-xs leading-5 text-white/60 transition hover:border-indigo-500/20 hover:bg-indigo-500/10 hover:text-white/85"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        ) : null}

        {/* Main content area */}
        {!compactFlow || activePanel === "answers" ? (
        <div className="relative z-10 grid min-w-0 gap-6 content-start overflow-hidden">
          {/* Error */}
          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Card className="border-red-500/20 bg-red-500/[0.03]">
                  <CardHeader>
                    <CardTitle className="text-red-200">Request Error</CardTitle>
                    <CardDescription>Check backend keys / model availability and retry.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap break-words rounded-lg border border-red-500/10 bg-black/30 p-3 text-xs text-red-200/80">
                      {typeof error === "string" ? error : JSON.stringify(error, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Loading animation */}
          <AnimatePresence>
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingCouncil elapsed={elapsed} />

              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Metrics Dashboard */}
          <AnimatePresence>
            {!loading && data?.responses ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <MetricsDashboard metrics={metricsForView} scores={scoresForView} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Final Decision Metrics (VeriDict vs Gemini vs ChatGPT) */}
          <AnimatePresence>
            {!loading && data?.final_decision_metrics?.length ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.055 }}
              >
                <MetricsDashboard
                  metrics={data.final_decision_metrics || []}
                  scores={data.final_decision_scores || []}
                  title="Final Decision Calculations"
                  subtitle="Same weighted metrics applied to VeriDict, Gemini, and ChatGPT"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Metrics Calculation Explainer */}
          <AnimatePresence>
            {!loading && data?.metrics ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
              >
                <MetricsExplainer metrics={metricsForView} scores={scoresForView} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Best Response */}
          <AnimatePresence>
            {!loading && data ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <BestResponsePanel
                  bestModel={answerView?.model || data.best_model}
                  bestResponse={answerView?.response || data.best_response}
                  reason={answerView?.reason || data.reason}
                  score={bestScore}
                  displayTitle={answerView?.title || "🏆 Best Response Selected"}
                  feedbackState={feedbackState}
                  onThumbsUp={onThumbsUp}
                  onThumbsDown={onThumbsDown}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {!loading && data ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.085 }}
              >
                <Card className="border-cyan-500/20 bg-cyan-500/[0.04]">
                  <CardHeader>
                    <CardTitle>Quantum Layer Selection</CardTitle>
                    <CardDescription>
                      Quantum-assisted optimization helps finalize which model score ranks highest.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-xs text-cyan-100/85">
                    <div>
                      Winner: <span className="text-emerald-300">{getModelLabel(quantumWinner)}</span>
                      {Number.isFinite(quantumWinnerScore) ? (
                        <span className="text-cyan-200"> • score {quantumWinnerScore.toFixed(4)}</span>
                      ) : null}
                    </div>
                    <div>
                      Status: <span className={quantumMeta?.applied ? "text-emerald-300" : "text-amber-200"}>{quantumMeta?.applied ? "applied" : "fallback scoring"}</span>
                      <span className="text-cyan-200"> • mode {quantumMeta?.mode || quantumStatus?.mode || "off"}</span>
                    </div>
                    <div className="text-cyan-200/80">
                      Backend: {quantumMeta?.backend || quantumStatus?.backend || "simulated-annealing"}
                      {typeof quantumMeta?.strength === "number" ? ` • strength ${Number(quantumMeta.strength).toFixed(2)}` : ""}
                      {typeof quantumMeta?.iterations === "number" ? ` • iterations ${quantumMeta.iterations}` : ""}
                    </div>
                    {quantumMeta?.reason ? (
                      <div className="text-amber-100/85">{quantumMeta.reason}</div>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Council Responses - Show First */}
          <AnimatePresence>
            {!loading && data?.responses ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 }}
              >
                <CouncilResponses responses={data.responses} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Gemini Comparison */}
          <AnimatePresence>
            {!loading && data ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ComparisonPanel
                  bestModel={data.best_model}
                  bestResponse={data.best_response}
                  geminiResponse={data.gemini_response}
                  chatgptResponse={data.chatgpt_response}
                  validatorScores={data.validator_scores || []}
                  validatorWinner={data.validator_winner || ""}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Final Winner (last stage) */}
          <AnimatePresence>
            {!loading && data?.final_decision_winner ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
              >
                <FinalDecisionPanel
                  winner={data.final_decision_winner}
                  winnerResponse={data.final_decision_winner_response}
                  reason={data.final_decision_reason}
                  scores={data.final_decision_scores || []}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Welcome state with animated background paths */}
          {!data && !error && !loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative isolate flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/40"
              style={{ minHeight: 380 }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-30">
                <NeuralBackground className="h-full w-full" color="#7c8cff" trailOpacity={0.12} particleCount={420} speed={0.7} />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center px-6 py-16">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/10 shadow-lg shadow-indigo-500/10">
                  <Zap className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white/90">Ready for VeriDict AI</h3>
                <p className="mt-3 max-w-md text-sm text-white/45 leading-6">
                  Submit a query to broadcast it to the multi-provider council. Models run in parallel,
                  with offline-first Ollama fallback support when configured.
                </p>
                <div className="mt-4 max-w-full break-words rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200/90">
                  Active now: {WORKING_MODEL_KEYS.map(getModelLabel).join(", ")}
                </div>
                <div className="mt-2 max-w-full break-words rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100/90">
                  Coming soon: {COMING_SOON_MODEL_KEYS.map(getModelLabel).join(", ")}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {WORKING_MODEL_KEYS.map((m) => (
                    <span key={m} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/40">
                      {getModelLabel(m)}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  );
}
