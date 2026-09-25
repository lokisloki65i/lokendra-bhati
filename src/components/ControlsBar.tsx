import React from "react";
import { AssistantState } from "../types";
import { Mic, MicOff, PhoneCall, PhoneOff, Sparkles, Monitor, StopCircle } from "lucide-react";
import { motion } from "motion/react";

interface ControlsBarProps {
  state: AssistantState;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleConnect: () => void;
  onDirectOpenUrl?: (url: string, title?: string) => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
}

const VOICE_PROMPTS = [
  { text: "Open YouTube", url: "https://www.youtube.com", title: "YouTube" },
  { text: "Open Google", url: "https://www.google.com", title: "Google" },
  { text: "Open Spotify", url: "https://open.spotify.com", title: "Spotify" },
  { text: "Open GitHub", url: "https://github.com", title: "GitHub" },
  { text: "Live Bitcoin Price", url: null, title: null },
  { text: "Search Chandrayaan", url: null, title: null },
];

export const ControlsBar: React.FC<ControlsBarProps> = ({
  state,
  isMuted,
  onToggleMute,
  onToggleConnect,
  onDirectOpenUrl,
  isScreenSharing,
  onToggleScreenShare,
}) => {
  const isConnected = state !== "disconnected";

  return (
    <footer className="w-full max-w-xl mx-auto px-4 pb-6 pt-2 flex flex-col items-center gap-3 z-30 relative select-none">
      {/* Quick Prompts Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0 hidden sm:block" />
        {VOICE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (prompt.url && onDirectOpenUrl) {
                onDirectOpenUrl(prompt.url, prompt.title || prompt.text);
              }
            }}
            className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 hover:border-white/30 whitespace-nowrap transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>{prompt.text}</span>
          </button>
        ))}
      </div>

      {/* Primary Touch Dock */}
      <div className="glass-panel px-4 py-2.5 rounded-full border border-white/10 flex items-center gap-4 shadow-2xl backdrop-blur-2xl">
        {/* Mute / Unmute Button */}
        <motion.button
          id="btn-toggle-mute"
          whileTap={{ scale: 0.92 }}
          onClick={onToggleMute}
          disabled={!isConnected}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            !isConnected
              ? "opacity-40 cursor-not-allowed bg-zinc-900 text-zinc-500"
              : isMuted
              ? "bg-white text-black shadow-lg shadow-white/20"
              : "bg-black text-white hover:bg-zinc-900 border border-white/20"
          }`}
          title={isMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </motion.button>

        {/* Screen Share Button (Gemini Vision) */}
        {isConnected && onToggleScreenShare && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing
                ? "bg-white text-black shadow-lg shadow-white/40 border-2 border-white"
                : "bg-black text-white hover:bg-zinc-900 border border-white/20"
            }`}
            title={isScreenSharing ? "Stop sharing screen" : "Share screen with Gemini Vision"}
          >
            {isScreenSharing ? (
              <StopCircle className="w-5 h-5 text-red-500 animate-pulse" />
            ) : (
              <Monitor className="w-5 h-5 text-white" />
            )}
          </motion.button>
        )}

        {/* Primary Call / End Session Button */}
        <motion.button
          id="btn-toggle-call"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.94 }}
          onClick={onToggleConnect}
          className={`px-6 h-12 rounded-full flex items-center gap-2.5 font-semibold text-sm tracking-wide transition-all shadow-lg border ${
            isConnected
              ? "bg-black text-white border-white hover:bg-zinc-900"
              : "bg-white text-black border-transparent hover:bg-zinc-200"
          }`}
        >
          {isConnected ? (
            <>
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </>
          ) : (
            <>
              <PhoneCall className="w-4 h-4" />
              <span>Start Call</span>
            </>
          )}
        </motion.button>
      </div>
    </footer>
  );
};
