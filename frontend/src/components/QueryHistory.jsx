import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2, Clock, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const STORAGE_KEY = "llm-council-query-history";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(query, responseCount, totalLatency, ragUsed = false, sourceCount = 0) {
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    query: query.slice(0, 200),
    timestamp: new Date().toISOString(),
    responseCount,
    avgLatencyMs: totalLatency ? Math.round(totalLatency / responseCount) : null,
    ragUsed,
    sourceCount,
  };
  const updated = [entry, ...history].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}

export default function QueryHistory({ onResubmit }) {
  const [history, setHistory] = useState(() => loadHistory());
  const [expanded, setExpanded] = useState(true);

  if (history.length === 0) return null;

  const handleClear = () => {
    setHistory(clearHistory());
  };

  const handleResubmit = (query) => {
    if (onResubmit) onResubmit(query);
  };

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = now - d;
      if (diff < 60000) return "just now";
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-sm">Query History</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/30 mr-1">{history.length} queries</span>
              <button
                onClick={handleClear}
                className="rounded-md p-1 text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-300"
                title="Clear history"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="rounded-md p-1 text-white/25 transition-colors hover:bg-white/10 hover:text-white/60"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>
          <CardDescription>Previous queries stored locally.</CardDescription>
        </CardHeader>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                <div className="grid gap-1.5 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                  {history.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-mono text-white/30">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 leading-4 line-clamp-2">{entry.query}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-white/30">
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(entry.timestamp)}
                          </span>
                          {entry.avgLatencyMs ? (
                            <span>avg {entry.avgLatencyMs}ms</span>
                          ) : null}
                          <span>{entry.responseCount} models</span>
                          {entry.ragUsed ? <span className="text-emerald-300/70">RAG {entry.sourceCount || 0} src</span> : null}
                        </div>
                      </div>
                      <button
                        onClick={() => handleResubmit(entry.query)}
                        className="mt-0.5 shrink-0 rounded-md p-1 text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:bg-indigo-500/15 hover:text-indigo-300"
                        title="Re-run this query"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
