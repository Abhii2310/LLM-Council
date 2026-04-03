import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2 } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export default function QueryInput({ onSubmit, loading }) {
  const [value, setValue] = useState("");

  const disabled = useMemo(() => loading || !value.trim(), [loading, value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !disabled) {
      onSubmit(value.trim());
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Panel</CardTitle>
            <CardDescription className="mt-1">
              Broadcast a prompt to the VeriDict AI model panel and compare outputs.
            </CardDescription>
          </div>
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-4 w-4 text-indigo-400" />
            </motion.div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a research question... (Cmd+Enter to submit)"
            className="min-h-[110px] w-full resize-none rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500/30 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-white/25"
          />
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              variant="primary"
              disabled={disabled}
              onClick={() => onSubmit(value.trim())}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>VeriDict AI is thinking...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Run in VeriDict AI</span>
                </>
              )}
            </Button>
          </motion.div>
          <p className="text-center text-[10px] text-white/25">Cmd+Enter to submit</p>
        </div>
      </CardContent>
    </Card>
  );
}
