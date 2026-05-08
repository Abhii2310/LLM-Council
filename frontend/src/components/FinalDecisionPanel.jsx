import { motion } from "framer-motion";
import { Crown, Sparkles, ShieldCheck, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const FINAL_MODEL_META = {
  verdict_ai: { name: "VeriDict AI", color: "from-emerald-500 to-teal-500", icon: ShieldCheck },
  gemini: { name: "Gemini", color: "from-violet-500 to-purple-600", icon: Sparkles },
  chatgpt: { name: "ChatGPT", color: "from-cyan-500 to-blue-600", icon: Bot },
};

export default function FinalDecisionPanel({
  winner,
  winnerResponse,
  reason,
  scores = [],
}) {
  if (!winner || !winnerResponse) return null;

  const winnerMeta = FINAL_MODEL_META[winner] || {
    name: winner,
    color: "from-indigo-500 to-fuchsia-500",
    icon: Crown,
  };
  const WinnerIcon = winnerMeta.icon;

  const winnerScore = Number((scores || []).find((s) => s.model === winner)?.final_score ?? 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] backdrop-blur-md overflow-hidden"
      aria-label="Final decision winner"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${winnerMeta.color} shadow-lg shadow-emerald-500/20`}>
            <WinnerIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-100">Final Decision Winner</h3>
            <p className="text-[11px] text-emerald-200/65">Unbiased winner from the same weighted metric formula across VeriDict, Gemini, and ChatGPT</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            {winnerMeta.name}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
            Score {winnerScore.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 prose prose-invert prose-sm max-w-none text-white/85">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{winnerResponse}</ReactMarkdown>
        </div>

        <div className="flex gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.08] p-3 text-xs text-indigo-100/90">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{reason || "Final decision reason unavailable."}</span>
        </div>
      </div>
    </motion.section>
  );
}
