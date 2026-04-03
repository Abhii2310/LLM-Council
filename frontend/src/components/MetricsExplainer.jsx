import { motion } from "framer-motion";
import { Calculator, TrendingUp, Users, Eye, Ruler, Sparkles } from "lucide-react";

export default function MetricsExplainer({ metrics, scores }) {
  if (!metrics || metrics.length === 0) return null;

  const metricDefinitions = [
    {
      key: "relevance",
      name: "Relevance",
      icon: TrendingUp,
      color: "from-blue-500 to-cyan-500",
      description: "Measures how well the response addresses the query using semantic similarity",
      formula: "cosine_similarity(query_embedding, response_embedding)",
      weight: 0.30,
    },
    {
      key: "semantic_similarity",
      name: "Semantic Similarity",
      icon: Users,
      color: "from-purple-500 to-pink-500",
      description: "Evaluates consistency with other VeriDict AI model responses",
      formula: "avg(cosine_similarity(response_i, response_j)) for all pairs",
      weight: 0.25,
    },
    {
      key: "agreement",
      name: "Agreement",
      icon: Users,
      color: "from-emerald-500 to-teal-500",
      description: "Consensus score across the VeriDict AI model panel",
      formula: "1 - std_dev(all_similarities) / mean(all_similarities)",
      weight: 0.20,
    },
    {
      key: "clarity",
      name: "Clarity",
      icon: Eye,
      color: "from-orange-500 to-amber-500",
      description: "Readability and structure quality of the response",
      formula: "flesch_reading_ease / 100",
      weight: 0.15,
    },
    {
      key: "length_optimization",
      name: "Length Optimization",
      icon: Ruler,
      color: "from-indigo-500 to-violet-500",
      description: "Optimal response length (not too short, not too long)",
      formula: "1 - |log(length / optimal_length)|",
      weight: 0.10,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-md overflow-hidden"
    >
      <div className="border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Metrics Calculation Engine</h3>
            <p className="text-xs text-white/60">How we compute the best response</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Metric Definitions */}
        <div className="space-y-3">
          {metricDefinitions.map((metric, idx) => {
            const Icon = metric.icon;
            const avgValue = metrics.reduce((sum, m) => sum + (m[metric.key] || 0), 0) / metrics.length;

            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-lg border border-white/5 bg-black/20 p-4 hover:border-white/10 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${metric.color} shadow-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white">{metric.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">Weight: {(metric.weight * 100).toFixed(0)}%</span>
                        <span className="text-xs font-mono text-emerald-400">{avgValue.toFixed(3)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-white/60 mb-2">{metric.description}</p>
                    <div className="rounded bg-black/30 px-2 py-1.5 border border-white/5">
                      <code className="text-[10px] text-cyan-400 font-mono">{metric.formula}</code>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Final Score Calculation */}
        <div className="rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-emerald-200">Final Score Calculation</h4>
          </div>
          <div className="space-y-2">
            <div className="rounded bg-black/30 px-3 py-2 border border-white/5">
              <code className="text-xs text-white/80 font-mono">
                final_score = (relevance × 0.30) + (semantic_sim × 0.25) + (agreement × 0.20) + (clarity × 0.15) + (length_opt × 0.10)
              </code>
            </div>
            <p className="text-xs text-white/60">
              Each metric is weighted based on importance. The model with the highest weighted score is selected as the best response.
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        {scores && scores.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide">Score Breakdown</h4>
            {scores
              .sort((a, b) => b.final_score - a.final_score)
              .map((score, idx) => {
                const modelMetrics = metrics.find(m => m.model === score.model);
                const isBest = idx === 0;
                
                return (
                  <motion.div
                    key={score.model}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`rounded-lg border p-3 ${
                      isBest
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/5 bg-black/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${isBest ? "text-emerald-200" : "text-white/80"}`}>
                        {isBest && "🏆 "}{score.model}
                      </span>
                      <span className={`text-sm font-mono ${isBest ? "text-emerald-300" : "text-white/60"}`}>
                        {score.final_score.toFixed(4)}
                      </span>
                    </div>
                    {modelMetrics && (
                      <div className="grid grid-cols-5 gap-2 text-[10px]">
                        <div className="text-center">
                          <div className="text-white/40">Rel</div>
                          <div className="text-blue-400 font-mono">{modelMetrics.relevance.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white/40">Sem</div>
                          <div className="text-purple-400 font-mono">{modelMetrics.semantic_similarity.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white/40">Agr</div>
                          <div className="text-emerald-400 font-mono">{modelMetrics.agreement.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white/40">Clr</div>
                          <div className="text-orange-400 font-mono">{modelMetrics.clarity.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white/40">Len</div>
                          <div className="text-indigo-400 font-mono">{modelMetrics.length_optimization.toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
