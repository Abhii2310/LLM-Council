import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpIcon,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock3,
  Home,
  Layers,
  MessageSquare,
  Rocket,
  Search,
  ThumbsDown,
  ThumbsUp,
  User,
  Zap,
} from "lucide-react";

import { Textarea } from "./textarea";
import { Button } from "./button";
import { DottedSurface } from "./dotted-surface";
import { cn } from "../../lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function useAutoResizeTextarea({ minHeight, maxHeight }) {
  const textareaRef = useRef(null);

  const adjustHeight = useCallback(
    (reset) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

function HistoryItem({ item, onSelect }) {
  return (
    <button
      onClick={() => onSelect?.(item.query)}
      className="w-full rounded-lg border border-white/5 bg-white/[0.03] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
      title={item.query}
    >
      <p className="line-clamp-2 text-xs text-white/85">{item.query}</p>
    </button>
  );
}

export default function RuixenMoonChat({
  mode,
  onModeChange,
  onGoHome,
  onSubmit,
  onHistorySelect,
  queryOptions,
  onQueryOptionsChange,
  loading,
  elapsed,
  history,
  messages,
  onThumbsUp,
  onThumbsDown,
  feedbackState,
  canFeedback,
}) {
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const endRef = useRef(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 52, maxHeight: 180 });

  const disabled = useMemo(() => loading || !message.trim(), [loading, message]);

  const send = useCallback(() => {
    const payload = message.trim();
    if (!payload || loading) return;
    onSubmit(payload, queryOptions);
    setMessage("");
    adjustHeight(true);
  }, [adjustHeight, loading, message, onSubmit, queryOptions]);

  const updateReasoning = useCallback((modeValue) => {
    onQueryOptionsChange?.((prev) => ({ ...prev, reasoningMode: modeValue }));
  }, [onQueryOptionsChange]);

  const toggleWebSearch = useCallback(() => {
    onQueryOptionsChange?.((prev) => ({ ...prev, enableWebSearch: !prev?.enableWebSearch }));
  }, [onQueryOptionsChange]);

  const lastAssistantId = useMemo(() => {
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") return messages[i]?.id;
    }
    return null;
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div className="relative mx-auto min-h-[82vh] w-full max-w-7xl overflow-hidden rounded-3xl px-4 py-6 sm:px-6 lg:px-8">
      <DottedSurface className="z-0 opacity-65" dotColor="#dbeafe" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-slate-950/45 via-slate-950/55 to-slate-950/72" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.2),transparent_55%)]" />

      <div className="relative z-20">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            onClick={() => onModeChange("developer")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs transition",
              mode === "developer" ? "bg-indigo-500/30 text-indigo-100" : "text-white/55 hover:text-white"
            )}
          >
            Developer Mode
          </button>
          <button
            onClick={() => onModeChange("user")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs transition",
              mode === "user" ? "bg-emerald-500/30 text-emerald-100" : "text-white/55 hover:text-white"
            )}
          >
            User Mode
          </button>
        </div>

        <Button variant="outline" onClick={onGoHome} className="gap-2 text-white/80">
          <Home className="h-4 w-4" />
          Home
        </Button>
      </div>

      <div className="grid min-h-[78vh] gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">VeriDict Chat</h2>
              <p className="text-[11px] text-white/45">User showcase mode</p>
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2 text-xs text-white/55">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="mr-auto">Recent History</span>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60 hover:text-white"
            >
              {historyOpen ? (
                <span className="inline-flex items-center gap-1"><ChevronUp className="h-3 w-3" /> Hide</span>
              ) : (
                <span className="inline-flex items-center gap-1"><ChevronDown className="h-3 w-3" /> Show</span>
              )}
            </button>
          </div>
          {historyOpen ? (
            <div className="grid max-h-[62vh] gap-2 overflow-y-auto pr-1">
              {history?.length ? (
                history.map((item, idx) => <HistoryItem key={item.id || idx} item={item} onSelect={onHistorySelect} />)
              ) : (
                <p className="text-xs text-white/40">No history yet.</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-[11px] text-white/45">
              History hidden. Click Show when needed.
            </div>
          )}
        </aside>

        <section className="flex min-h-[78vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md">
          <div className="border-b border-white/10 px-5 py-4">
            <h1 className="text-lg font-semibold text-white">How can I help you today?</h1>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {!messages?.length ? (
              <div className="mx-auto mt-10 max-w-xl text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <MessageSquare className="h-6 w-6 text-white/80" />
                </div>
                <p className="text-sm text-white/70">Ask anything to get started.</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {["Generate Code", "Launch App", "UI Components", "Theme Ideas"].map((quick) => (
                    <span
                      key={quick}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/65"
                    >
                      {quick === "Generate Code" ? <Rocket className="mr-1 inline h-3 w-3" /> : null}
                      {quick === "UI Components" ? <Layers className="mr-1 inline h-3 w-3" /> : null}
                      {quick}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {messages?.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-6 sm:max-w-[80%]",
                    msg.role === "user"
                      ? "border-indigo-400/25 bg-indigo-500/15 text-indigo-50"
                      : "border-white/10 bg-white/[0.04] text-white/90"
                  )}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
                    {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    <span>{msg.role === "user" ? "You" : msg.model || "Assistant"}</span>
                  </div>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none leading-7">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.role === "assistant" && msg.webResearchUsed ? (
                    <div className="mt-2 rounded-md border border-sky-400/20 bg-sky-500/10 p-2 text-[10px] text-sky-100/85">
                      Web research attached • {Array.isArray(msg.webResearchSources) ? msg.webResearchSources.length : 0} sources
                    </div>
                  ) : null}
                  {msg.role === "assistant" && msg.webResearchNote === "web_search_enabled_but_no_sources" ? (
                    <div className="mt-2 rounded-md border border-amber-400/20 bg-amber-500/10 p-2 text-[10px] text-amber-100/85">
                      Web search was enabled, but no reliable fresh sources were retrieved in this run.
                    </div>
                  ) : null}
                  {msg.role === "assistant" && Array.isArray(msg.webResearchSources) && msg.webResearchSources.length ? (
                    <div className="mt-2 space-y-1">
                      {msg.webResearchSources.map((src, idx) => (
                        <div key={`${msg.id}_src_${idx}`} className="rounded-md border border-white/10 bg-black/25 p-2 text-[10px] text-white/70">
                          <div className="font-medium text-white/85">{src.title || src.source || "Web source"}</div>
                          <div className="truncate text-white/45">{src.url || src.source || ""}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {msg.role === "assistant" && msg.id === lastAssistantId && canFeedback ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onThumbsUp}
                        disabled={feedbackState === "sending" || feedbackState === "sent_up"}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Helpful
                      </button>
                      <button
                        type="button"
                        onClick={onThumbsDown}
                        disabled={feedbackState === "sending" || feedbackState === "sent_down"}
                        className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Show alternate
                      </button>
                      <span className="text-[10px] text-white/45">
                        {feedbackState === "sending" ? "Saving..." : ""}
                        {feedbackState === "sent_up" ? "Feedback saved." : ""}
                        {feedbackState === "sent_down" ? "Alternate answer loaded." : ""}
                        {feedbackState === "error" ? "Could not save feedback." : ""}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  Thinking{elapsed ? ` • ${elapsed}s` : "..."}
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => updateReasoning("thinking")}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] transition shadow-sm",
                  queryOptions?.reasoningMode === "thinking"
                    ? "border-indigo-300/50 bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/20 text-indigo-100 shadow-indigo-500/20"
                    : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                )}
              >
                Thinking
              </button>
              <button
                type="button"
                onClick={() => updateReasoning("deep_research")}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] transition shadow-sm",
                  queryOptions?.reasoningMode === "deep_research"
                    ? "border-cyan-300/50 bg-gradient-to-r from-cyan-500/30 to-sky-500/20 text-cyan-100 shadow-cyan-500/20"
                    : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                )}
              >
                Deep research
              </button>
              <button
                type="button"
                onClick={() => updateReasoning("standard")}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] transition shadow-sm",
                  queryOptions?.reasoningMode === "standard"
                    ? "border-emerald-300/50 bg-gradient-to-r from-emerald-500/30 to-lime-500/20 text-emerald-100 shadow-emerald-500/20"
                    : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                )}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={toggleWebSearch}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition shadow-sm",
                  queryOptions?.enableWebSearch
                    ? "border-amber-300/50 bg-gradient-to-r from-amber-500/30 to-orange-500/20 text-amber-100 shadow-amber-500/20"
                    : "border-white/10 bg-white/5 text-white/55 hover:text-white"
                )}
              >
                <Search className="h-3 w-3" /> Web search
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !disabled) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type your request... (Cmd/Ctrl+Enter to send)"
                className="min-h-[52px] resize-none border-none bg-transparent px-3 py-3 text-white focus-visible:ring-0"
                style={{ overflow: "hidden" }}
              />
              <div className="flex items-center justify-end">
                <Button
                  variant="primary"
                  size="icon"
                  disabled={disabled}
                  onClick={send}
                  className="h-9 w-9 rounded-lg"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
