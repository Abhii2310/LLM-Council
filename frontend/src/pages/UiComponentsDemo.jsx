import { useState } from "react";
import { Link } from "react-router-dom";
import { HorizonHeroSection } from "../components/ui/horizon-hero-section";
import { PromptInputBox } from "../components/ui/ai-prompt-box";
import IntegrationHero from "../components/ui/integration-hero";

export default function UiComponentsDemo() {
  const [messages, setMessages] = useState([]);

  const handleSendMessage = (message, files = []) => {
    setMessages((prev) => [{ message, fileCount: files.length, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 6));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Link to="/" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs hover:bg-black/50">
          Home
        </Link>
        <Link to="/dashboard" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs hover:bg-black/50">
          Dashboard
        </Link>
      </div>

      <HorizonHeroSection />

      <IntegrationHero />

      <section
        className="relative py-24 px-6 bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(2,6,23,0.72), rgba(2,6,23,0.88)), url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1800&q=80')",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">AI Prompt Box Demo</h2>
          <p className="text-white/70 mb-8">Interactive prompt input with upload, quick modes, mic state, and image preview.</p>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              <PromptInputBox onSend={handleSendMessage} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white/90 mb-3">Latest Prompt Events</h3>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {messages.length === 0 ? (
                  <p className="text-xs text-white/50">No prompts yet. Send one to see event payloads.</p>
                ) : (
                  messages.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-2">
                      <p className="text-xs text-indigo-200 break-words">{item.message}</p>
                      <p className="mt-1 text-[11px] text-white/50">{item.fileCount} file(s) • {item.at}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
