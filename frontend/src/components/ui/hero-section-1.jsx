import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Menu, X, Brain, Cpu, Scale, Microscope, Sparkles, ShieldCheck, Gauge, BarChart3, Workflow, Target, Layers3 } from "lucide-react";
import { Button } from "./button";
import { AnimatedGroup } from "./animated-group";
import AnimatedGradientBackground from "./animated-gradient-background";
import { cn } from "../../lib/utils";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const menuItems = [
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Models Used", href: "#models-used" },
  { name: "Metrics", href: "#metrics" },
  { name: "About", href: "#about" },
];

const VERIDICT_MODELS = [
  {
    key: "llama31-8b",
    name: "Llama 3.1 8B",
    provider: "Groq",
    role: "Fast Drafting",
    strengths: "Quick high-quality first-pass answers with low latency.",
    icon: Brain,
  },
  {
    key: "llama33-70b",
    name: "Llama 3.3 70B",
    provider: "Groq",
    role: "Deep Reasoning",
    strengths: "Stronger multi-step reasoning and detailed structured output.",
    icon: Cpu,
  },
  {
    key: "qwen3-32b",
    name: "Qwen 3 32B",
    provider: "Groq",
    role: "Balanced Analysis",
    strengths: "Balanced quality, speed, and nuanced analytical responses.",
    icon: Scale,
  },
  {
    key: "llama4-scout-17b",
    name: "Llama 4 Scout 17B",
    provider: "Groq",
    role: "Creative Alternatives",
    strengths: "Alternative framing and broader exploration of solution paths.",
    icon: Microscope,
  },
];

export function HeroSectionOne() {
  const navigate = useNavigate();
  const [activeModel, setActiveModel] = React.useState(VERIDICT_MODELS[0].key);
  const selectedModel = VERIDICT_MODELS.find((model) => model.key === activeModel) || VERIDICT_MODELS[0];
  const SelectedIcon = selectedModel.icon;

  return (
    <>
      <HeroHeader />
      <main className="relative isolate overflow-hidden bg-slate-950 text-white">
        <AnimatedGradientBackground
          startingGap={115}
          Breathing={true}
          animationSpeed={0.025}
          breathingRange={7}
          containerClassName="pointer-events-none opacity-45 -z-30"
        />
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block"
        >
          <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(240,100%,85%,.15)_0,hsla(220,90%,55%,.05)_50%,hsla(220,80%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(210,100%,85%,.09)_0,hsla(220,100%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(300,100%,85%,.05)_0,hsla(260,100%,45%,.02)_80%,transparent_100%)]" />
        </div>

        <section className="relative z-10">
          <div className="relative pt-24 md:pt-36">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 0.6,
                    },
                  },
                },
                item: {
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { type: "spring", bounce: 0.3, duration: 1.4 },
                  },
                },
              }}
              className="absolute inset-0 -z-20"
            >
              <img
                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2200&q=80"
                alt="background"
                className="absolute inset-x-0 top-56 -z-20 hidden lg:top-24 lg:block h-[900px] w-full object-cover opacity-40"
                width="2200"
                height="900"
              />
            </AnimatedGroup>

            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,#020617_75%)]"
            />

            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <div className="mx-auto mb-5 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-[11px] text-white/75 backdrop-blur-md">
                    <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Production-grade evaluation</span>
                    <span className="h-3 w-px bg-white/20" />
                    <span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5 text-indigo-300" /> 4-model consensus engine</span>
                    <span className="h-3 w-px bg-white/20" />
                    <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-fuchsia-300" /> Gemini validation lane</span>
                  </div>

                  <a
                    href="#features"
                    className="hover:bg-background/80 bg-white/5 group mx-auto flex w-fit items-center gap-4 rounded-full border border-white/15 p-1 pl-4 shadow-md shadow-black/20 transition-all duration-300"
                  >
                    <span className="text-foreground text-sm text-white/85">Now comparing VeriDict AI consensus vs baseline AI</span>
                    <span className="block h-4 w-0.5 border-l border-white/20 bg-white/40" />

                    <div className="bg-black/50 group-hover:bg-white/10 size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6"><ArrowRight className="m-auto size-3" /></span>
                        <span className="flex size-6"><ArrowRight className="m-auto size-3" /></span>
                      </div>
                    </div>
                  </a>

                  <h1 className="mt-8 max-w-5xl mx-auto text-balance text-6xl md:text-7xl lg:mt-14 xl:text-[5.3rem] font-semibold tracking-tight">
                    VeriDict AI for <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">Reliable AI Decisions</span>
                  </h1>
                  <p className="mx-auto mt-8 max-w-3xl text-balance text-lg text-white/70">
                    Instead of trusting one model, VeriDict AI runs a panel of advanced models in parallel,
                    scores each response across five decision metrics, and returns the most reliable output
                    with transparent reasoning you can verify.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: { transition: { staggerChildren: 0.05, delayChildren: 0.6 } },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div className="bg-white/10 rounded-[14px] border border-white/20 p-0.5">
                    <Button asChild size="lg" variant="primary" className="rounded-xl px-5 text-base">
                      <button type="button" onClick={() => navigate("/dashboard")}>Enter Dashboard</button>
                    </Button>
                  </div>
                  <Button asChild size="lg" variant="ghost" className="h-10.5 rounded-xl px-5 border border-white/15">
                    <a href="#how-it-works"><span className="text-nowrap">How it works</span></a>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.75 } },
                },
                ...transitionVariants,
              }}
            >
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div aria-hidden className="bg-gradient-to-b to-slate-950 absolute inset-0 z-10 from-transparent from-35%" />
                <div className="inset-shadow-2xs ring-white/10 bg-black/40 relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/20 p-4 shadow-lg shadow-black/40 ring-1">
                  <img
                    className="aspect-[15/8] relative rounded-2xl object-cover"
                    src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2400&q=80"
                    alt="VeriDict AI dashboard preview"
                    width="2400"
                    height="1280"
                  />
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>

        <section id="features" className="relative z-10 scroll-mt-28 bg-slate-950 pb-16 pt-16 md:pb-32">
          <div className="group relative m-auto max-w-6xl px-6">
            <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
              <a href="#about" className="block text-sm duration-150 hover:opacity-75 text-white/80">
                <span> Learn about the decision engine</span>
                <ChevronRight className="ml-1 inline-block size-3" />
              </a>
            </div>

            <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 transition-all duration-500 group-hover:opacity-60 md:grid-cols-3">
              {[
                { t: "Parallel Model Panel", d: "4 specialized VeriDict models generate diverse reasoning paths." },
                { t: "5-Metric Scoring", d: "Relevance, Agreement, Clarity, Similarity, Length optimization." },
                { t: "Transparent Selection", d: "Best output chosen with explainable weighted confidence." },
              ].map((item) => (
                <div key={item.t} className="rounded-xl border border-white/15 bg-white/5 p-5">
                  <h3 className="text-sm font-semibold text-white/90">{item.t}</h3>
                  <p className="mt-2 text-sm text-white/65">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="relative z-10 scroll-mt-28 pb-20 px-6">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-3xl md:text-4xl font-semibold">How VeriDict AI works</h2>
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">Built for reliable decision workflows</div>
            </div>
            <p className="mt-4 text-white/70 max-w-3xl">
              Input once. Evaluate across multiple models. Score transparently. Return the strongest response with a clear rationale.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-4 text-sm">
              {[
                { title: "Broadcast", copy: "Your query is sent to all VeriDict models in parallel.", icon: Workflow },
                { title: "Evaluate", copy: "Each response is measured across five quality dimensions.", icon: Gauge },
                { title: "Rank", copy: "Weighted scoring computes a final confidence score.", icon: BarChart3 },
                { title: "Deliver", copy: "Best output is returned with transparent selection reason.", icon: Target },
              ].map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border border-white/15 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-indigo-300 font-mono text-xs">0{idx + 1}</div>
                      <Icon className="h-4 w-4 text-white/65" />
                    </div>
                    <div className="mt-2 text-white/90 font-medium">{step.title}</div>
                    <div className="mt-1 text-white/60 text-xs leading-5">{step.copy}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="models-used" className="relative z-10 scroll-mt-28 pb-20 px-6">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-black/30 p-8 md:p-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold">LLMs used in VeriDict AI</h2>
                <p className="mt-3 max-w-3xl text-white/70">
                  VeriDict AI runs these models in parallel for each query, then applies weighted evaluation metrics.
                  We also run a Gemini validation track for side-by-side confidence checking.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
                <Sparkles className="h-3.5 w-3.5" /> Gemini 2.0 Flash validation enabled
              </div>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {VERIDICT_MODELS.map((model) => {
                const Icon = model.icon;
                const isActive = activeModel === model.key;
                return (
                  <button
                    type="button"
                    key={model.key}
                    onClick={() => setActiveModel(model.key)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all duration-300",
                      isActive
                        ? "border-indigo-300/60 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
                        : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-2 text-white/90">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-semibold">{model.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">{model.provider}</p>
                    <p className="mt-2 text-xs text-indigo-200">{model.role}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-6">
              <div className="flex items-center gap-2 text-white/90">
                <SelectedIcon className="h-4 w-4 text-indigo-300" />
                <h3 className="text-lg font-semibold">{selectedModel.name}</h3>
              </div>
              <p className="mt-1 text-sm text-white/50">Provider: {selectedModel.provider}</p>
              <p className="mt-4 text-sm text-white/75">{selectedModel.strengths}</p>
            </div>
          </div>
        </section>

        <section id="metrics" className="relative z-10 scroll-mt-28 pb-16 px-6">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-500/10 via-slate-900/70 to-fuchsia-500/10 p-8 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-3xl md:text-4xl font-semibold">Metrics that drive selection</h2>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">Weighted final score</span>
            </div>
            <p className="mt-4 max-w-3xl text-sm text-white/70">
              VeriDict AI uses five weighted metrics to reduce randomness and choose the most dependable answer.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {[
                { name: "Relevance", weight: 30 },
                { name: "Semantic Similarity", weight: 25 },
                { name: "Agreement", weight: 20 },
                { name: "Clarity", weight: 15 },
                { name: "Length Optimization", weight: 10 },
              ].map((m) => (
                <div key={m.name} className="rounded-xl border border-white/15 bg-black/35 p-4">
                  <div className="text-xs text-white/50">{m.name}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{m.weight}%</div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400" style={{ width: `${m.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 pb-10 px-6">
          <div className="mx-auto max-w-6xl grid gap-4 md:grid-cols-3">
            {[
              {
                t: "Why multi-model matters",
                d: "Single-model answers can be biased or brittle. VeriDict AI compares reasoning paths before final selection.",
              },
              {
                t: "What you get back",
                d: "Top-ranked answer, model-by-model outputs, latency visibility, and transparent scoring rationale.",
              },
              {
                t: "Best for teams",
                d: "Research, product strategy, architecture tradeoffs, and high-stakes prompts requiring confidence.",
              },
            ].map((item) => (
              <div key={item.t} className="rounded-xl border border-white/15 bg-white/5 p-5">
                <h3 className="text-sm font-semibold text-white/90">{item.t}</h3>
                <p className="mt-2 text-sm text-white/65">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="relative z-10 scroll-mt-28 pb-16 px-6">
          <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-black/30 p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold">About VeriDict AI</h2>
                <p className="mt-4 text-white/70 max-w-2xl leading-7">
                  VeriDict AI is a multi-LLM decision layer for teams that need answers they can trust.
                  Instead of betting on one model, it compares multiple expert models, scores outputs with
                  transparent logic, and helps you move faster with confidence.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-white/65">
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Parallel evaluation</span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Transparent scoring</span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">Production-ready UX</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 p-5">
                <p className="text-sm text-white/60">Ready to test your next high-stakes prompt?</p>
                <Button asChild size="lg" variant="primary" className="mt-4 w-full">
                  <button type="button" onClick={() => navigate("/dashboard")}>Launch VeriDict Dashboard</button>
                </Button>
                <p className="mt-3 text-[11px] text-white/45">VeriDict AI • Reliable AI Decision Engine • 2026</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const HeroHeader = () => {
  const navigate = useNavigate();
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  const scrollToSection = (href) => {
    if (!href?.startsWith("#")) return;
    const id = href.slice(1);
    const element = document.getElementById(id);
    if (!element) return;
    const y = element.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState ? "active" : undefined} className="fixed z-40 w-full px-2 group">
        <div className={cn("mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12", isScrolled && "bg-slate-950/60 max-w-5xl rounded-2xl border border-white/15 backdrop-blur-lg lg:px-5")}>
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link to="/" aria-label="home" className="flex items-center space-x-2">
                <Logo />
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      className="text-white/60 hover:text-white block duration-150"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(item.href);
                      }}
                    >
                      <span>{item.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-white/15 p-6 shadow-2xl shadow-black/30 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-3 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-white/60 hover:text-white block duration-150"
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuState(false);
                          scrollToSection(item.href);
                        }}
                      >
                        <span>{item.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className={cn(isScrolled && "lg:hidden")}>
                  <button type="button" onClick={() => navigate("/dashboard")}>View Dashboard</button>
                </Button>
                <Button asChild size="sm" variant="primary" className={cn(isScrolled ? "lg:inline-flex" : "hidden")}> 
                  <button type="button" onClick={() => navigate("/dashboard")}>Enter</button>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

const Logo = ({ className }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-5 w-5 rounded-md border border-indigo-300/40 bg-gradient-to-br from-indigo-400/40 to-cyan-400/30">
        <span className="absolute left-1/2 top-0.5 h-4 w-px -translate-x-1/2 bg-white/60" />
        <span className="absolute top-1/2 left-0.5 w-4 h-px -translate-y-1/2 bg-white/60" />
      </div>
      <span className="text-sm font-semibold tracking-wide text-white">VeriDict AI</span>
    </div>
  );
};
