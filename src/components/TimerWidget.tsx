import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ActiveTimer } from "../types";
import { Timer as TimerIcon, Play, Pause, X } from "lucide-react";

interface TimerWidgetProps {
  timers: ActiveTimer[];
  onTogglePause: (id: string) => void;
  onRemove: (id: string) => void;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  timers,
  onTogglePause,
  onRemove,
}) => {
  if (timers.length === 0) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed top-20 left-4 z-40 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {timers.map((timer) => {
          const progress = timer.totalSeconds > 0
            ? Math.max(0, Math.min(1, timer.remainingSeconds / timer.totalSeconds))
            : 0;

          const isFinished = timer.remainingSeconds === 0;

          return (
            <motion.div
              key={timer.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto p-3 rounded-2xl glass-panel border shadow-xl backdrop-blur-xl ${
                isFinished
                  ? "border-rose-500/50 bg-rose-950/40 animate-pulse"
                  : "border-cyan-500/30 bg-slate-900/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TimerIcon className={`w-4 h-4 ${isFinished ? "text-rose-400" : "text-cyan-400"}`} />
                  <span className="text-xs font-semibold tracking-wide text-slate-200">
                    {timer.label}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {!isFinished && (
                    <button
                      onClick={() => onTogglePause(timer.id)}
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                      title={timer.isPaused ? "Resume" : "Pause"}
                    >
                      {timer.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(timer.id)}
                    className="text-slate-400 hover:text-rose-300 p-1 rounded transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-xl font-bold tracking-wider font-mono ${isFinished ? "text-rose-300" : "text-cyan-300"}`}>
                  {isFinished ? "Time's Up!" : formatTime(timer.remainingSeconds)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {timer.isPaused ? "PAUSED" : "RUNNING"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isFinished ? "bg-rose-500" : "bg-gradient-to-r from-cyan-500 to-indigo-500"
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
