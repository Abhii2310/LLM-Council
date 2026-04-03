import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";

function mergeMetricsAndScores(metrics = [], scores = []) {
  const scoreMap = new Map(scores.map((s) => [s.model, s.final_score]));
  return metrics.map((m) => ({
    model: m.model,
    relevance: Number(m.relevance ?? 0),
    semantic_similarity: Number(m.semantic_similarity ?? 0),
    agreement: Number(m.agreement ?? 0),
    clarity: Number(m.clarity ?? 0),
    length_optimization: Number(m.length_optimization ?? 0),
    final_score: Number(scoreMap.get(m.model) ?? 0),
  }));
}

export default function MetricsDashboard({ metrics, scores }) {
  const data = mergeMetricsAndScores(metrics, scores);
  if (!data.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Metrics Dashboard</h3>
          <p className="text-[11px] text-white/45">Final weighted score per model (0-1)</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="model" stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 1]} stroke="rgba(255,255,255,0.45)" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,22,0.96)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                color: "white",
              }}
            />
            <Bar dataKey="final_score" fill="#60a5fa" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-white/55 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((d) => (
          <div key={d.model} className="rounded-md border border-white/8 bg-black/20 px-3 py-2">
            <div className="truncate font-semibold text-white/85 mb-1.5">{d.model}</div>
            <div className="space-y-0.5">
              <div className="flex justify-between"><span className="text-white/60">Relevance:</span> <span className="text-white/80 font-medium">{d.relevance.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Semantic Similarity:</span> <span className="text-white/80 font-medium">{d.semantic_similarity.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Agreement:</span> <span className="text-white/80 font-medium">{d.agreement.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Clarity:</span> <span className="text-white/80 font-medium">{d.clarity.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Length Optimization:</span> <span className="text-white/80 font-medium">{d.length_optimization.toFixed(3)}</span></div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
