import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { DirectOpenEvent } from "../types";
import { ExternalLink, CheckCircle2, AlertCircle, X, Compass } from "lucide-react";

interface DirectOpenHUDProps {
  event: DirectOpenEvent | null;
  onDismiss: () => void;
}

export const DirectOpenHUD: React.FC<DirectOpenHUDProps> = ({ event, onDismiss }) => {
  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [event, onDismiss]);

  if (!event) return null;

  const handleManualOpen = () => {
    window.open(event.url, "_blank", "noopener,noreferrer");
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        key={event.url + event.timestamp}
        initial={{ opacity: 0, y: -25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg select-none"
      >
        <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-rose-500 shadow-2xl shadow-cyan-950/40">
          <div className="bg-slate-950/95 backdrop-blur-xl rounded-[15px] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                {event.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                ) : (
                  <Compass className="w-5 h-5 text-cyan-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Direct Launch
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    Voice Command
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white truncate mt-0.5">
                  Opening {event.title}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {event.url}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleManualOpen}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
              >
                <span>Launch</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
