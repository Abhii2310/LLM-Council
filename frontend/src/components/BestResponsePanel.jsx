import { motion } from "framer-motion";
import { Crown, Sparkles, Brain, Cpu, Scale, Microscope } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MODEL_DISPLAY = {
  llama3_8b: { name: "Llama 3.1 8B", icon: Brain, color: "from-violet-500 to-purple-600" },
  llama3_70b: { name: "Llama 3.3 70B", icon: Cpu, color: "from-blue-500 to-cyan-500" },
  qwen_32b: { name: "Qwen 3 32B", icon: Scale, color: "from-orange-500 to-amber-500" },
  llama4_scout: { name: "Llama 4 Scout 17B", icon: Microscope, color: "from-emerald-500 to-green-500" },
};

export default function BestResponsePanel({ bestModel, bestResponse, reason, score }) {
  if (!bestModel) return null;

  const modelInfo = MODEL_DISPLAY[bestModel] || { name: bestModel, icon: Crown, color: "from-emerald-400 to-teal-500" };
  const ModelIcon = modelInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] backdrop-blur-md overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-emerald-500/15">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${modelInfo.color} shadow-lg shadow-emerald-500/20`}>
            <ModelIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-200">🏆 Best Response Selected</h3>
            <p className="text-[11px] text-emerald-200/60">Top model by weighted multi-metric scoring</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            {modelInfo.name}
          </div>
          {typeof score === "number" ? (
            <div className="text-[10px] text-emerald-300/70">Score: {score.toFixed(4)}</div>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-white/8 bg-black/20 p-4 text-sm leading-relaxed text-white/85 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {bestResponse || "No best response generated."}
          </ReactMarkdown>
        </div>
        <div className="flex gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.06] p-3 text-xs text-indigo-200/85">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{reason || "Reasoning unavailable."}</span>
        </div>
      </div>
    </motion.div>
  );
}
