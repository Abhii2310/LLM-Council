import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Cpu, Zap, Sparkles, Scale } from "lucide-react";

const COUNCIL_MEMBERS = [
  { key: "llama3_70b",   name: "Llama 3.3 70B",     provider: "Groq",      icon: Brain,    color: "from-violet-500 to-purple-600",  duration: 2.5 },
  { key: "llama4_scout", name: "Llama 4 Scout 17B",  provider: "Groq",      icon: Zap,      color: "from-blue-500 to-cyan-500",      duration: 3.0 },
  { key: "kimi_k2",      name: "Kimi K2",            provider: "Groq",      icon: Sparkles, color: "from-pink-500 to-rose-500",      duration: 3.5 },
  { key: "llama3_8b",    name: "Llama 3.1 8B",       provider: "Groq",      icon: Cpu,      color: "from-emerald-500 to-green-500",  duration: 2.0 },
  { key: "gemini",       name: "Gemini 2.5 Flash",   provider: "Google AI", icon: Scale,    color: "from-amber-500 to-orange-500",   duration: 3.0 },
];

function PulsingOrb({ delay, color }) {
  return (
    <motion.div
      className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${color}`}
      animate={{ scale: [1, 1.8, 1], opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.1, repeat: Infinity, delay }}
    />
  );
}

export default function LoadingCouncil({ elapsed }) {
  const [phases, setPhases] = useState(["Broadcasting queries…"]);

  useEffect(() => {
    const msgs = [
      { at: 1,  msg: "Models generating responses in parallel…" },
      { at: 4,  msg: "Scoring with 5 evaluation metrics…" },
      { at: 7,  msg: "Selecting best response…" },
      { at: 9,  msg: "Finalising Gemini validation…" },
      { at: 12, msg: "Almost done — compiling results…" },
    ];
    const timers = msgs.map(({ at, msg }) =>
      setTimeout(() => setPhases((p) => [...p.slice(-1), msg]), at * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const currentPhase = phases[phases.length - 1];

  return (
    <div className="grid gap-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <motion.div
          className="h-5 w-5 rounded-full border-2 border-indigo-400 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
        />
        <div>
          <h2 className="text-base font-semibold text-white/90">VeriDict AI is evaluating…</h2>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentPhase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-white/45 mt-0.5"
            >
              {currentPhase}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Elapsed timer */}
        {elapsed && (
          <span className="ml-auto rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-mono text-xs text-amber-300">
            {elapsed}s
          </span>
        )}
      </div>

      {/* ── Progress bar (overall) ── */}
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500"
          initial={{ width: "4%" }}
          animate={{ width: "92%" }}
          transition={{ duration: 12, ease: "easeOut" }}
        />
      </div>

      {/* ── Model rows ── */}
      <div className="grid gap-2.5">
        {COUNCIL_MEMBERS.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 backdrop-blur-sm"
            >
              {/* Icon */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${m.color} shadow-md`}>
                <Icon className="h-4 w-4 text-white" />
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs font-semibold text-white/80">{m.name}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-white/35 uppercase tracking-wide">
                    {m.provider}
                  </span>
                </div>

                {/* Per-model progress bar */}
                <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${m.color} opacity-70`}
                    initial={{ width: "0%" }}
                    animate={{ width: ["0%", "60%", "85%", "100%"] }}
                    transition={{
                      duration: m.duration,
                      delay: i * 0.15,
                      times: [0, 0.4, 0.75, 1],
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>

              {/* Animated dots */}
              <div className="flex gap-0.5">
                <PulsingOrb delay={i * 0.12} color={m.color} />
                <PulsingOrb delay={i * 0.12 + 0.18} color={m.color} />
                <PulsingOrb delay={i * 0.12 + 0.36} color={m.color} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Bottom hint ── */}
      <motion.div
        className="flex items-center justify-center gap-1.5 text-[11px] text-white/30"
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <span>4 models + Gemini running in parallel</span>
        <span className="flex gap-0.5">
          {[0, 0.25, 0.5].map((d) => (
            <motion.span
              key={d}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: d }}
            >·</motion.span>
          ))}
        </span>
      </motion.div>
    </div>
  );
}
