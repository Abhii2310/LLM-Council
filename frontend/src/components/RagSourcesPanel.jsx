import { motion } from "framer-motion";
import { BookOpen, Sparkles, ExternalLink } from "lucide-react";

export default function RagSourcesPanel({ ragEnabled, ragUsed, sources }) {
  if (!ragEnabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.02 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            <BookOpen className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Retrieved Sources</h3>
            <p className="text-[11px] text-white/40">Grounding context used for this answer</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${
            ragUsed
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
              : "bg-white/5 text-white/40 border border-white/10"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          {ragUsed ? "RAG Active" : "No matching sources"}
        </span>
      </div>

      {ragUsed && sources?.length ? (
        <div className="p-4 grid gap-2.5">
          {sources.map((s, idx) => (
            <motion.div
              key={`${s.source}-${s.chunk_id}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-lg border border-white/8 bg-black/20 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-[10px] font-semibold text-indigo-300">
                    {s.rank}
                  </span>
                  <span className="text-xs font-medium text-white/80 truncate">{s.title}</span>
                  <span className="text-[10px] text-white/35">chunk {s.chunk_id}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/50">score {Number(s.score).toFixed(3)}</span>
                  <span className="inline-flex items-center gap-1 text-white/35">
                    <ExternalLink className="h-2.5 w-2.5" />
                    {s.source}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/55 line-clamp-3">{s.snippet}</p>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3 text-xs text-white/45">
          Add text/markdown files to backend `knowledge_base/` to enable retrieval grounding.
        </div>
      )}
    </motion.div>
  );
}
