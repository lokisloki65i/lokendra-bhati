import React, { useState } from "react";
import { AssistantState } from "../types";
import { Sparkles, Info, Activity, Volume2, ShieldCheck, X, Globe, MapPin, Mic, Compass, Video, Palette, Check, ShieldAlert, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../services/ThemeContext";
import { useOwner } from "../services/OwnerContext";

interface HeaderControlsProps {
  state: AssistantState;
  sessionDuration: number;
  latencyMs: number;
  onOpenSearchGrounding?: () => void;
  onOpenMapsGrounding?: () => void;
  onOpenTranscribe?: () => void;
  onOpenVideoSetup?: () => void;
  onOpenOwnerOption?: () => void;
}

export const HeaderControls: React.FC<HeaderControlsProps> = ({
  state,
  sessionDuration,
  latencyMs,
  onOpenSearchGrounding,
  onOpenMapsGrounding,
  onOpenTranscribe,
  onOpenVideoSetup,
  onOpenOwnerOption,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { currentTheme, themeId, setTheme, themes } = useTheme();
  const { isOwnerConfigured, ownerName } = useOwner();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <header className="w-full max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between z-30 relative select-none">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl p-[1px] shadow-lg transition-all"
            style={{
              background: `linear-gradient(to top right, ${currentTheme.primary}, ${currentTheme.secondary})`,
              boxShadow: `0 0 15px ${currentTheme.glow}`,
            }}
          >
            <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-4 h-4" style={{ color: currentTheme.primary }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base sm:text-lg font-bold tracking-wider text-white font-['Outfit']">
                SIMI
              </h1>
              <span
                className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full border tracking-wider"
                style={{
                  backgroundColor: `rgba(${currentTheme.primaryRgb}, 0.15)`,
                  borderColor: `rgba(${currentTheme.primaryRgb}, 0.35)`,
                  color: currentTheme.primary,
                }}
              >
                AI COMPANION
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Voice-to-Voice AI Assistant
            </p>
          </div>
        </div>

        {/* Feature Triggers & Live telemetry */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Holographic Color Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="px-2.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 text-white border border-white/30 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-white/10"
              title="Holographic Glow Color Presets"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
                style={{
                  backgroundColor: currentTheme.primary,
                  boxShadow: `0 0 8px ${currentTheme.glow}`,
                }}
              />
              <span className="hidden md:inline font-mono text-[11px]">{currentTheme.name}</span>
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Floating Presets Dropdown */}
            <AnimatePresence>
              {showThemeMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowThemeMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/20 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                        Glow Presets
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border"
                        style={{
                          borderColor: `rgba(${currentTheme.primaryRgb}, 0.4)`,
                          color: currentTheme.primary,
                        }}
                      >
                        Active
                      </span>
                    </div>

                    <div className="space-y-1">
                      {themes.map((theme) => {
                        const isSelected = theme.id === themeId;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setTheme(theme.id);
                              setShowThemeMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all ${
                              isSelected
                                ? "bg-white/10 text-white font-medium"
                                : "hover:bg-white/5 text-zinc-300 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform"
                                style={{
                                  backgroundColor: theme.primary,
                                  boxShadow: isSelected ? `0 0 10px ${theme.glow}` : "none",
                                }}
                              />
                              <div>
                                <div className="text-xs font-semibold leading-tight">{theme.name}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">{theme.tag}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check
                                className="w-4 h-4 shrink-0"
                                style={{ color: theme.primary }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Owner Option Trigger (Protected by password ggmrloki) */}
          <button
            onClick={onOpenOwnerOption}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
              isOwnerConfigured
                ? "bg-black hover:bg-zinc-900 text-white border-white/30 shadow-white/10"
                : "bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border-rose-500/40 animate-pulse"
            }`}
            title="Owner Option (Protected by password: ggmrloki — upload API key and Master name)"
          >
            {isOwnerConfigured ? (
              <KeyRound className="w-3.5 h-3.5" style={{ color: currentTheme.primary }} />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="font-medium">
              {isOwnerConfigured ? (
                <>
                  <span className="hidden sm:inline">Owner: </span>
                  <span className="font-semibold text-white truncate max-w-[80px] inline-block align-bottom">{ownerName}</span>
                </>
              ) : (
                "Owner Option"
              )}
            </span>
          </button>

          {/* Hologram Option Trigger */}
          <button
            onClick={onOpenVideoSetup}
            className="px-2.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 text-white border border-white/30 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-white/10"
            title="Hologram Option (Upload & Manage Custom Holograms)"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Hologram Option</span>
          </button>
          
          {/* Search Grounding Trigger */}
          <button
            onClick={onOpenSearchGrounding}
            className="px-2.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 text-white border border-white/30 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-white/10"
            title="Google Search Grounding (gemini-3.5-flash)"
          >
            <Globe className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">Search Grounding</span>
          </button>

          {/* Maps Grounding Trigger */}
          <button
            onClick={onOpenMapsGrounding}
            className="px-2.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 text-white border border-white/30 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-white/10"
            title="Google Maps Grounding (gemini-3.5-flash)"
          >
            <MapPin className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">Maps Grounding</span>
          </button>

          {/* Transcribe Trigger */}
          <button
            onClick={onOpenTranscribe}
            className="px-2.5 py-1.5 rounded-xl bg-black hover:bg-zinc-900 text-white border border-white/30 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-white/10"
            title="Microphone Audio Transcription (gemini-3.5-transcribe)"
          >
            <Mic className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">Transcribe</span>
          </button>

          {/* Session timer / latency */}
          {state !== "disconnected" && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-mono text-xs">{formatDuration(sessionDuration)}</span>
              {latencyMs > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-white" />
                    {latencyMs}ms
                  </span>
                </>
              )}
            </div>
          )}

          {/* Info & capabilities button */}
          <button
            onClick={() => setShowInfo(true)}
            className="p-2 rounded-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="About Simi"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Info & Persona Modal */}
      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-md rounded-3xl bg-zinc-950 border border-white/30 p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/40 flex items-center justify-center text-white">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Meet Simi
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Real-Time Voice AI Companion
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3.5 text-xs text-zinc-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <h4 className="text-white font-semibold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Personality & Voice Profile
                  </h4>
                  <p className="text-zinc-400">
                    A young, confident, witty, charming, and emotionally aware female AI companion. Playful, energetic, naturally conversational, warm, and responsive.
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-1 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-white" />
                    Real Browser Integration
                  </h4>
                  <p className="text-zinc-400">
                    Say "Open YouTube", "Search the web for...", or "Play this song on YouTube" — Simi executes a real tool call that actually opens the live URL, Google search results page, or YouTube video in a new browser tab.
                  </p>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-1">
                    Grounding & Intelligence Capabilities
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    <li><strong className="text-white">Google Search Grounding:</strong> Real-time information using gemini-3.5-flash</li>
                    <li><strong className="text-white">Google Maps Grounding:</strong> Places, reviews, and direct Maps links using gemini-3.5-flash</li>
                    <li><strong className="text-white">Audio Transcription:</strong> Microphone speech transcription using gemini-3.5-transcribe</li>
                  </ul>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-400">
                    Natural interruptions supported. Just speak while Simi is talking, and she will immediately pause and listen to you.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setShowInfo(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
