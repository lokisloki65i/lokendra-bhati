import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AssistantState } from "../types";
import { Radio, Mic, Volume2, ShieldAlert } from "lucide-react";
import { useOwner } from "../services/OwnerContext";

interface StatusBadgeProps {
  state: AssistantState;
  isMuted: boolean;
  errorMessage: string | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  state,
  isMuted,
  errorMessage,
}) => {
  const { isOwnerConfigured, ownerName } = useOwner();

  if (errorMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-2 rounded-full glass-panel border-rose-500/30 bg-rose-950/40 text-rose-300 text-xs flex items-center gap-2 max-w-sm text-center shadow-lg"
      >
        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
        <span className="truncate">{errorMessage}</span>
      </motion.div>
    );
  }

  const getBadgeConfig = () => {
    switch (state) {
      case "connecting":
        return {
          pillClass: "border-rose-500/30 bg-rose-950/30 text-rose-300",
          dotClass: "bg-rose-400 animate-ping",
          title: "CONNECTING TO SIMI",
          subtitle: `Connecting ultra-low latency voice bridge for Master ${ownerName || "User"}...`,
          icon: <Radio className="w-3.5 h-3.5 animate-spin" />,
        };
      case "listening":
        return {
          pillClass: isMuted
            ? "border-amber-500/30 bg-amber-950/30 text-amber-300"
            : "border-cyan-500/30 bg-cyan-950/30 text-cyan-300",
          dotClass: isMuted ? "bg-amber-400" : "bg-cyan-400 animate-pulse",
          title: isMuted ? "MICROPHONE MUTED" : `LISTENING TO MASTER ${ownerName ? ownerName.toUpperCase() : ""}`,
          subtitle: isMuted
            ? "Unmute below to speak"
            : "Speak naturally in English or Hinglish — Simi is listening",
          icon: <Mic className="w-3.5 h-3.5" />,
        };
      case "speaking":
        return {
          pillClass: "border-rose-500/30 bg-rose-950/30 text-rose-300",
          dotClass: "bg-rose-400 animate-ping",
          title: "SIMI IS SPEAKING",
          subtitle: "Natural interruptions enabled — interject anytime",
          icon: <Volume2 className="w-3.5 h-3.5 animate-bounce" />,
        };
      case "disconnected":
      default:
        return {
          pillClass: isOwnerConfigured
            ? "border-white/20 bg-slate-900/60 text-slate-300"
            : "border-rose-500/30 bg-rose-950/20 text-rose-300",
          dotClass: isOwnerConfigured ? "bg-emerald-400" : "bg-rose-400 animate-pulse",
          title: isOwnerConfigured ? `READY FOR MASTER ${ownerName.toUpperCase()}` : "OWNER ACTIVATION REQUIRED",
          subtitle: isOwnerConfigured
            ? "Tap call below to start live voice session"
            : "Click 'Owner Option' above (password: ggmrloki) to configure your API key",
          icon: <Radio className="w-3.5 h-3.5 opacity-60" />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={state + (isMuted ? "-muted" : "")}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wider glass-panel ${config.pillClass}`}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotClass}`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                state === "disconnected" ? "bg-slate-500" : "bg-white"
              }`}
            />
          </span>
          <span className="flex items-center gap-1.5">{config.title}</span>
        </motion.div>
      </AnimatePresence>

      <p className="text-xs text-slate-400/80 font-normal tracking-wide h-4">
        {config.subtitle}
      </p>
    </div>
  );
};
