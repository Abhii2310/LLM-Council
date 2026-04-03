import { motion } from "framer-motion";
import { Timer, Zap, TrendingDown } from "lucide-react";
import { Brain, Cpu, Shield, Microscope, Scale } from "lucide-react";

const MODEL_META = {
  llama3_8b:    { name: "Llama 3.1 8B",      icon: Brain,      color: "from-violet-500 to-purple-600",  bg: "bg-violet-500",   text: "text-violet-300" },
  llama3_70b:   { name: "Llama 3.3 70B",     icon: Cpu,        color: "from-blue-500 to-cyan-500",      bg: "bg-blue-500",     text: "text-blue-300" },
  qwen_32b:     { name: "Qwen 3 32B",        icon: Scale,      color: "from-orange-500 to-amber-500",   bg: "bg-orange-500",   text: "text-orange-300" },
  llama4_scout: { name: "Llama 4 Scout 17B", icon: Microscope, color: "from-emerald-500 to-green-500",  bg: "bg-emerald-500",  text: "text-emerald-300" },
};

function getMeta(key) {
  return MODEL_META[key] || { name: key, icon: Zap, color: "from-gray-500 to-gray-600", bg: "bg-gray-500", text: "text-gray-300" };
}

export default function LatencyChart({ responses }) {
  if (!responses || responses.length === 0) return null;

  const items = responses
    .filter((r) => r.latency_ms != null)
    .map((r) => ({ ...r, meta: getMeta(r.model) }))
    .sort((a, b) => a.latency_ms - b.latency_ms);

  if (items.length === 0) return null;

  const maxLatency = Math.max(...items.map((r) => r.latency_ms));
  const minLatency = Math.min(...items.map((r) => r.latency_ms));
  const avgLatency = (items.reduce((s, r) => s + r.latency_ms, 0) / items.length).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <Timer className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Response Latency</h3>
            <p className="text-[11px] text-white/40">Per-model response time (ms)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-300">
            <TrendingDown className="h-3 w-3" />
            {minLatency.toFixed(0)}ms fastest
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/50">
            avg {avgLatency}ms
          </span>
        </div>
      </div>

      {/* Bars */}
      <div className="px-4 pb-4 grid gap-2.5">
        {items.map((r, idx) => {
          const Icon = r.meta.icon;
          const pct = Math.max((r.latency_ms / maxLatency) * 100, 8);
          const isFastest = r.latency_ms === minLatency;

          return (
            <motion.div
              key={r.model}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * idx, type: "spring", stiffness: 200, damping: 22 }}
              className="group"
            >
              <div className="flex items-center gap-3">
                {/* Model icon */}
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${r.meta.color}`}>
                  <Icon className="h-3 w-3 text-white" />
                </div>

                {/* Name + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/80">{r.meta.name}</span>
                    <span className={`text-xs font-mono ${isFastest ? "text-emerald-300" : "text-white/50"}`}>
                      {(r.latency_ms / 1000).toFixed(2)}s
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${r.meta.color} ${isFastest ? "opacity-100" : "opacity-70"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 * idx, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
