import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Sparkles,
  Cpu,
  ChevronDown,
  ChevronUp,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ─── helpers ────────────────────────────────────────────────────── */
function parseGeminiResponse(raw = "") {
  const match = raw.match(/^\[Groq Fallback[^\]]*\]\s*/i);
  if (match) return { isGroqFallback: true, cleanText: raw.slice(match[0].length) };
  return { isGroqFallback: false, cleanText: raw };
}

function wordCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ─── CopyButton ─────────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      title="Copy response"
      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/40 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/70"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/* ─── ResponseCard ───────────────────────────────────────────────── */
function ResponseCard({ side, label, sublabel, text, icon, gradient, borderColor, labelColor, badgeText, badgeColor, delay = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const words = wordCount(text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col overflow-hidden rounded-2xl border bg-white/[0.02] backdrop-blur-xl"
      style={{ borderColor }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl opacity-20"
        style={{ background: gradient }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          {/* Icon badge */}
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl shadow-lg"
            style={{ background: gradient }}
          >
            {icon}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold tracking-wide ${labelColor}`}>{label}</span>
              {badgeText && (
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{ background: badgeColor?.bg, color: badgeColor?.text, border: `1px solid ${badgeColor?.border}` }}
                >
                  {badgeText}
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/35">{sublabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Word count */}
          <span className="text-[10px] text-white/25">{words}w</span>
          {/* Copy */}
          <CopyButton text={text} />
          {/* Expand / collapse */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-white/10 bg-white/5 p-1 text-white/40 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/70"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4">
              {text ? (
                <div className="prose prose-invert prose-sm max-w-none text-sm leading-7 text-white/80
                  prose-headings:text-white/90 prose-headings:font-semibold
                  prose-strong:text-white/90 prose-strong:font-semibold
                  prose-li:my-1 prose-p:my-2
                  prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:text-xs
                  prose-th:text-white/70 prose-td:text-white/60">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-white/30 italic">
                  <AlertCircle className="h-4 w-4" />
                  No response available.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function ComparisonPanel({
  bestModel,
  bestResponse,
  geminiResponse,
  chatgptResponse,
  validatorScores = [],
  validatorWinner = "",
}) {
  if (!bestResponse && !geminiResponse && !chatgptResponse) return null;

  const { isGroqFallback, cleanText } = parseGeminiResponse(geminiResponse);
  const scoreMap = Object.fromEntries((validatorScores || []).map((s) => [s.model, Number(s.final_score || 0)]));

  const cards = [
    {
      key: "verdict_ai",
      label: `VeriDict Best · ${bestModel || "—"}`,
      sublabel: "Top-ranked council response by multi-metric scoring",
      text: bestResponse,
      icon: <Trophy className="h-4 w-4 text-white" />,
      gradient: "linear-gradient(135deg, #10b981, #059669)",
      borderColor: "rgba(16,185,129,0.2)",
      labelColor: "text-emerald-300",
      badgeText: "Council Winner",
      badgeColor: { bg: "rgba(16,185,129,0.12)", text: "#6ee7b7", border: "rgba(16,185,129,0.25)" },
    },
    {
      key: "gemini",
      label: isGroqFallback ? "Gemini Validator · Groq Fallback" : "Gemini Validator",
      sublabel: isGroqFallback
        ? "Gemini quota exhausted; fallback handled by Groq"
        : "Independent validation from Google Gemini",
      text: cleanText,
      icon: isGroqFallback ? <Cpu className="h-4 w-4 text-white" /> : <Sparkles className="h-4 w-4 text-white" />,
      gradient: isGroqFallback
        ? "linear-gradient(135deg, #f59e0b, #d97706)"
        : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
      borderColor: isGroqFallback ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)",
      labelColor: isGroqFallback ? "text-amber-300" : "text-purple-300",
      badgeText: isGroqFallback ? "Quota Fallback" : "Gemini AI",
      badgeColor: isGroqFallback
        ? { bg: "rgba(245,158,11,0.12)", text: "#fcd34d", border: "rgba(245,158,11,0.25)" }
        : { bg: "rgba(139,92,246,0.12)", text: "#c4b5fd", border: "rgba(139,92,246,0.25)" },
    },
    {
      key: "chatgpt",
      label: "ChatGPT Validator",
      sublabel: "Independent validation from OpenAI",
      text: chatgptResponse,
      icon: <Brain className="h-4 w-4 text-white" />,
      gradient: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
      borderColor: "rgba(14,165,233,0.2)",
      labelColor: "text-cyan-300",
      badgeText: "ChatGPT",
      badgeColor: { bg: "rgba(14,165,233,0.12)", text: "#67e8f9", border: "rgba(14,165,233,0.25)" },
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
      aria-label="Side-by-side model comparison"
    >
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/20">
            <Scale className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white/90">VeriDict vs Gemini vs ChatGPT</h2>
            <p className="text-[11px] text-white/35">Three-way validator comparison on dashboard</p>
          </div>
        </div>

        {/* Live status pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] font-medium text-white/50">
            {isGroqFallback ? "Groq Fallback Active" : "Gemini Active"}
          </span>
        </div>
      </div>

      {/* ── Stat bar ── */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => {
          const score = Number(scoreMap[c.key] || 0);
          const highlight = validatorWinner === c.key;
          return (
          <div
            key={c.key}
            className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
              highlight
                ? "border-emerald-500/30 bg-emerald-500/[0.07]"
                : "border-white/[0.07] bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {c.icon}
              <span className="text-[10px] text-white/35 uppercase tracking-wider">{c.label}</span>
            </div>
            <p className={`text-sm font-semibold ${highlight ? "text-emerald-300" : "text-white/70"}`}>
              Score: {score.toFixed(4)}
            </p>
            {highlight && (
              <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-400 opacity-60" />
            )}
          </div>
          );
        })}
      </div>

      {/* ── Response cards ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((c, idx) => (
          <ResponseCard
            key={c.key}
            side={c.key}
            label={c.label}
            sublabel={c.sublabel}
            text={c.text}
            icon={c.icon}
            gradient={c.gradient}
            borderColor={c.borderColor}
            labelColor={c.labelColor}
            badgeText={validatorWinner === c.key ? "Validator Winner" : c.badgeText}
            badgeColor={c.badgeColor}
            delay={0.05 + idx * 0.07}
          />
        ))}
      </div>
    </motion.section>
  );
}
