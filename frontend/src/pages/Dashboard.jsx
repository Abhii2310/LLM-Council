import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Clock, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackgroundPaths } from "../components/ui/background-paths";
import NeuralBackground from "../components/ui/flow-field-background";

import QueryInput from "../components/QueryInput";
import CouncilResponses from "../components/CouncilResponses";
import LoadingCouncil from "../components/LoadingCouncil";
import LatencyChart from "../components/LatencyChart";
import MetricsDashboard from "../components/MetricsDashboard";
import MetricsExplainer from "../components/MetricsExplainer";
import BestResponsePanel from "../components/BestResponsePanel";
import ComparisonPanel from "../components/ComparisonPanel";
import EvaluationHistoryPanel from "../components/EvaluationHistoryPanel";
import { evaluateQuery, fetchHistory } from "../services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      const items = await fetchHistory(20);
      setHistory(items || []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onSubmit = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    setElapsed(null);
    const start = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(((Date.now() - start) / 1000).toFixed(1));
    }, 100);

    try {
      const res = await evaluateQuery(query);
      setData(res);
      await loadHistory();
    } catch (e) {
      setError(e?.response?.data || e?.message || "Request failed");
      setData(null);
    } finally {
      clearInterval(timerRef.current);
      setElapsed(((Date.now() - start) / 1000).toFixed(1));
      setLoading(false);
    }
  }, [loadHistory]);

  const successCount = data?.responses?.filter((r) => !r.error).length || 0;
  const bestScore = useMemo(() => {
    if (!data?.scores?.length || !data?.best_model) return null;
    const row = data.scores.find((s) => s.model === data.best_model);
    return row ? Number(row.final_score) : null;
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">VeriDict AI</h1>
              <p className="text-xs text-white/40">Reliable Multi-Model AI Decision Engine</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm text-white/70 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            <Activity className="h-3 w-3" /> 4 VeriDict Models
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
            Multi-Metric Evaluation + Gemini Validation
          </span>
          {elapsed && !loading ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              <Clock className="h-3 w-3" /> {elapsed}s
            </span>
          ) : null}
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
        {/* Left sidebar */}
        <div className="grid gap-6 content-start">
          <QueryInput onSubmit={onSubmit} loading={loading} />

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
              </div>
            </CardContent>
          </Card>

          {/* Evaluation History */}
          <EvaluationHistoryPanel items={history} onResubmit={onSubmit} />

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
                        <div
                          key={p}
                          className="cursor-default rounded-lg border border-white/5 bg-black/20 p-3 text-xs text-white/60 leading-5"
                        >
                          {p}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Main content area */}
        <div className="grid gap-6 content-start">
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
                <MetricsDashboard metrics={data.metrics || []} scores={data.scores || []} />
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
                <MetricsExplainer metrics={data.metrics || []} scores={data.scores || []} />
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
                  bestModel={data.best_model}
                  bestResponse={data.best_response}
                  reason={data.reason}
                  score={bestScore}
                />
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
                  query={data.query}
                  bestModel={data.best_model}
                  bestResponse={data.best_response}
                  geminiResponse={data.gemini_response}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Latency Chart */}
          <AnimatePresence>
            {!loading && data?.responses ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <LatencyChart responses={data.responses} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Welcome state with animated background paths */}
          {!data && !error && !loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/20 backdrop-blur-sm"
              style={{ minHeight: 380 }}
            >
              <div className="absolute inset-0 opacity-35">
                <NeuralBackground className="h-full w-full" color="#7c8cff" trailOpacity={0.12} particleCount={500} speed={0.75} />
              </div>
              <div className="absolute inset-0 opacity-20">
                <BackgroundPaths title="" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center px-6 py-16">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/10 shadow-lg shadow-indigo-500/10">
                  <Zap className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white/90">Ready for VeriDict AI</h3>
                <p className="mt-3 max-w-md text-sm text-white/45 leading-6">
                  Submit a query to broadcast it to the VeriDict AI model panel. Each model will generate
                  a response in parallel, and you can compare them side-by-side.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {["Llama 3.3 70B", "Llama 4 Scout 17B", "Kimi K2", "Llama 3.1 8B"].map((m) => (
                    <span key={m} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/40">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
