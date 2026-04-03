import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Sparkles,
  Cpu,
  ChevronDown,
  ChevronUp,
  Trophy,
  Zap,
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
export default function ComparisonPanel({ query, bestModel, bestResponse, geminiResponse }) {
  if (!bestResponse && !geminiResponse) return null;

  const { isGroqFallback, cleanText } = parseGeminiResponse(geminiResponse);

  const veriDictWords = wordCount(bestResponse);
  const geminiWords   = wordCount(cleanText);
  const winner        = veriDictWords >= geminiWords ? "veridict" : "gemini";

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
            <h2 className="text-sm font-bold tracking-tight text-white/90">VeriDict AI vs Gemini</h2>
            <p className="text-[11px] text-white/35">Side-by-side validation comparison</p>
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
        {[
          {
            label: "VeriDict Response",
            value: `${veriDictWords} words`,
            icon: <Trophy className="h-3.5 w-3.5 text-emerald-400" />,
            highlight: winner === "veridict",
          },
          {
            label: "Model Used",
            value: isGroqFallback ? "Llama 3.3 70B" : "Gemini 2.5 Flash",
            icon: isGroqFallback
              ? <Cpu className="h-3.5 w-3.5 text-amber-400" />
              : <Sparkles className="h-3.5 w-3.5 text-purple-400" />,
            highlight: false,
          },
          {
            label: "Gemini Response",
            value: `${geminiWords} words`,
            icon: <Zap className="h-3.5 w-3.5 text-purple-400" />,
            highlight: winner === "gemini",
          },
        ].map(({ label, value, icon, highlight }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-xl border p-3 transition-all ${
              highlight
                ? "border-emerald-500/30 bg-emerald-500/[0.07]"
                : "border-white/[0.07] bg-white/[0.02]"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {icon}
              <span className="text-[10px] text-white/35 uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-sm font-semibold ${highlight ? "text-emerald-300" : "text-white/70"}`}>
              {value}
            </p>
            {highlight && (
              <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-400 opacity-60" />
            )}
          </div>
        ))}
      </div>

      {/* ── Response cards ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* VeriDict Best */}
        <ResponseCard
          side="veridict"
          label={`VeriDict Best · ${bestModel || "—"}`}
          sublabel="Top-ranked council response by multi-metric scoring"
          text={bestResponse}
          icon={<Trophy className="h-4 w-4 text-white" />}
          gradient="linear-gradient(135deg, #10b981, #059669)"
          borderColor="rgba(16,185,129,0.2)"
          labelColor="text-emerald-300"
          badgeText="Best Ranked"
          badgeColor={{ bg: "rgba(16,185,129,0.12)", text: "#6ee7b7", border: "rgba(16,185,129,0.25)" }}
          delay={0.05}
        />

        {/* Gemini / Groq Fallback */}
        <ResponseCard
          side="gemini"
          label={isGroqFallback ? "Groq Fallback · Llama 3.3 70B" : "Google Gemini 2.5 Flash"}
          sublabel={
            isGroqFallback
              ? "Activated automatically — Gemini quota exhausted"
              : "Independent validation from Google Gemini"
          }
          text={cleanText}
          icon={
            isGroqFallback
              ? <Cpu className="h-4 w-4 text-white" />
              : <Sparkles className="h-4 w-4 text-white" />
          }
          gradient={
            isGroqFallback
              ? "linear-gradient(135deg, #f59e0b, #d97706)"
              : "linear-gradient(135deg, #8b5cf6, #7c3aed)"
          }
          borderColor={isGroqFallback ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)"}
          labelColor={isGroqFallback ? "text-amber-300" : "text-purple-300"}
          badgeText={isGroqFallback ? "Quota Fallback" : "Gemini AI"}
          badgeColor={
            isGroqFallback
              ? { bg: "rgba(245,158,11,0.12)", text: "#fcd34d", border: "rgba(245,158,11,0.25)" }
              : { bg: "rgba(139,92,246,0.12)", text: "#c4b5fd", border: "rgba(139,92,246,0.25)" }
          }
          delay={0.12}
        />
      </div>
      {/* ── ChatGPT Validator ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="pt-2 flex justify-end"
      >
        <ChatGPTValidatorButton query={query} bestResponse={bestResponse} cleanText={cleanText} />
      </motion.div>
    </motion.section>
  );
}

// Update the ChatGPTValidatorButton function:
function ChatGPTValidatorButton({ query, bestResponse, cleanText }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");

  const prompt = `I have two AI responses to the following query. Please act as an expert judge, evaluate both based on accuracy, clarity, and directly answering the prompt, and tell me which one is better.

Query: "${query || "Context previously provided"}"

--- RESPONSE 1 (VeriDict) ---
${bestResponse}

--- RESPONSE 2 (Gemini) ---
${cleanText}

Which response is better and why?`;

  const handleDeepLink = () => {
    // Attempt to copy to clipboard just in case, but rely heavily on the ?q= Deep Link
    navigator.clipboard.writeText(prompt).catch(() => {});
    
    // ChatGPT supports passing the prompt directly in the URL using the ?q= parameter
    const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    window.open(url, "_blank");
  };

  const handleManualCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 pt-2">
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowPrompt((v) => !v)}
          className="text-xs text-white/40 hover:text-white transition-colors"
        >
          {showPrompt ? "Hide Prompt" : "View Prompt Manually"}
        </button>

        <button
          onClick={handleDeepLink}
          className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/70 shadow-sm ring-1 ring-white/10 transition-all hover:bg-emerald-500/10 hover:text-emerald-300 hover:ring-emerald-500/30"
        >
          <Brain className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Validate with ChatGPT</span>
        </button>
      </div>

      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium pl-1 text-white/60">Validation Prompt:</span>
                <button
                  onClick={handleManualCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                >
                  {copyStatus === "success" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copyStatus === "success" ? "Copied" : "Copy text"}
                </button>
              </div>
              <textarea
                readOnly
                value={prompt}
                className="h-40 w-full resize-y rounded-lg border border-white/5 bg-white/5 p-3 text-xs text-white/70 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
