import { motion } from "framer-motion";
import { History, RotateCcw } from "lucide-react";

export default function EvaluationHistoryPanel({ items, onResubmit }) {
  if (!items?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
          <History className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Query History</h3>
          <p className="text-[11px] text-white/45">Stored in SQLite from evaluation runs</p>
        </div>
      </div>

      <div className="grid gap-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
        {items.map((it, idx) => (
          <div key={it.id || idx} className="group rounded-lg border border-white/8 bg-black/20 p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs leading-5 text-white/75 line-clamp-2">{it.query}</p>
                <p className="text-[10px] text-white/35 mt-1">
                  {it.best_model || "-"} • {it.created_at || ""}
                </p>
              </div>
              <button
                onClick={() => onResubmit?.(it.query)}
                className="rounded-md p-1 text-white/25 opacity-0 transition-all group-hover:opacity-100 hover:bg-indigo-500/15 hover:text-indigo-300"
                title="Re-run"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
