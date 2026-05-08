import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Cpu, Microscope, Scale, CheckCircle2, XCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

const MODEL_META = {
  llama3_8b:    { name: "Llama 3.1 8B",      provider: "Groq", icon: Brain,      color: "from-violet-500 to-purple-600",  border: "border-violet-500/30" },
  llama3_70b:   { name: "Llama 3.3 70B",     provider: "Groq", icon: Cpu,        color: "from-blue-500 to-cyan-500",      border: "border-blue-500/30" },
  kimi_k2:      { name: "Kimi K2",           provider: "OpenRouter", icon: Scale, color: "from-orange-500 to-amber-500",   border: "border-orange-500/30" },
  llama4_scout: { name: "Llama 4 Scout 17B", provider: "Groq", icon: Microscope, color: "from-emerald-500 to-green-500",  border: "border-emerald-500/30" },
  deepseek_chat: { name: "DeepSeek Chat", provider: "DeepSeek", icon: Brain, color: "from-cyan-500 to-sky-500", border: "border-cyan-500/30" },
  cohere_command_r: { name: "Cohere Command R", provider: "Cohere", icon: Scale, color: "from-amber-500 to-yellow-500", border: "border-amber-500/30" },
  cerebras_llama3_70b: { name: "Cerebras Llama 3.1 70B", provider: "Cerebras", icon: Cpu, color: "from-indigo-500 to-blue-500", border: "border-indigo-500/30" },
  sambanova_qwen: { name: "SambaNova Qwen 2.5 72B", provider: "SambaNova", icon: Scale, color: "from-fuchsia-500 to-pink-500", border: "border-fuchsia-500/30" },
  nvidia_llama: { name: "NVIDIA Llama 3.1 Nemotron 70B", provider: "NVIDIA", icon: Cpu, color: "from-green-500 to-emerald-500", border: "border-green-500/30" },
  together_qwen: { name: "Together Qwen 2.5 72B", provider: "Together", icon: Scale, color: "from-rose-500 to-orange-500", border: "border-rose-500/30" },
  aimlapi_mistral: { name: "AI/ML API Mistral Small", provider: "AIMLAPI", icon: Brain, color: "from-sky-500 to-blue-600", border: "border-sky-500/30" },
  ollama_local: { name: "Ollama Local", provider: "Ollama", icon: Brain, color: "from-slate-500 to-zinc-600", border: "border-slate-500/30" },
};

function providerFromModelString(providerModel) {
  const value = String(providerModel || "");
  if (!value.includes("/")) return "Unknown";
  const provider = value.split("/", 1)[0];
  return provider.replaceAll("_", " ");
}

function fallbackMeta(modelKey, providerModel) {
  if (MODEL_META[modelKey]) return MODEL_META[modelKey];
  return {
    name: modelKey,
    provider: providerFromModelString(providerModel),
    icon: Brain,
    color: "from-gray-500 to-gray-600",
    border: "border-gray-500/30",
  };
}

function ResponseCard({ r, idx }) {
  const meta = fallbackMeta(r.model, r.provider_model);
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const hasError = !!r.error;
  const successCount = r.response ? r.response.split(/\s+/).length : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(r.response || r.error || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: idx * 0.08, type: "spring", stiffness: 200, damping: 20 }}
      className="group"
    >
      <div className={`relative overflow-hidden rounded-xl border ${hasError ? "border-red-500/20" : meta.border} bg-white/[0.03] backdrop-blur-md transition-all hover:bg-white/[0.06]`}>
        {/* Gradient top accent */}
        <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${meta.color}`} />

        {/* Header */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.color} shadow-lg`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{meta.name}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">{meta.provider}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {hasError ? (
                <span className="flex items-center gap-1 text-[11px] text-amber-300">
                  <XCircle className="h-3 w-3" /> Temporarily unavailable
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> {successCount} words
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
              title="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {hasError ? (
                  <div className="whitespace-pre-wrap break-words rounded-lg border border-amber-500/15 bg-amber-500/5 p-3 text-xs text-amber-100/85 leading-5">
                    This model is currently unavailable for this run. Fallback routing continues automatically.
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/20 p-4 text-sm leading-relaxed text-white/85 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {r.response || "No response"}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function CouncilResponses({ responses }) {
  const successCount = (responses || []).filter((r) => !r.error).length;
  const totalCount = (responses || []).length;

  return (
    <div className="grid gap-5">
      {/* Section header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">VeriDict AI Model Responses</h2>
          <p className="mt-1 text-sm text-white/50">
            Independent responses from {totalCount} models — compare and evaluate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            {successCount}/{totalCount} OK
          </span>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid gap-4 lg:grid-cols-1">
        {(responses || []).map((r, idx) => (
          <ResponseCard key={r.model} r={r} idx={idx} />
        ))}
      </div>
    </div>
  );
}
