import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AssistantState } from "../types";
import { useVideoContext } from "../image";
import { useTheme } from "../services/ThemeContext";
import { useOwner } from "../services/OwnerContext";
import {
  Mic,
  MicOff,
  Power,
  Volume2,
  Sparkles,
  Activity,
  Radio,
  Zap,
  Eye,
  Smile,
  SmilePlus,
  ShieldCheck,
  Cpu,
  Waves,
  Upload,
} from "lucide-react";

export type AnimeExpression = "attentive" | "cheerful" | "winking" | "resting";

interface AvatarRendererProps {
  state: AssistantState;
  inputVolume: number;
  outputVolume: number;
  frequencies: number[];
  isMuted: boolean;
  onToggleConnect: () => void;
  onToggleMute: () => void;
}

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  state,
  inputVolume,
  outputVolume,
  frequencies,
  isMuted,
  onToggleConnect,
  onToggleMute,
}) => {
  const { holograms, hasAnyHologram, getHologramForExpression } = useVideoContext();
  const { currentTheme } = useTheme();
  const { ownerName, isOwnerConfigured } = useOwner();
  // Current active expression
  const [currentExpression, setCurrentExpression] = useState<AnimeExpression>("resting");
  const [manualOverride, setManualOverride] = useState<AnimeExpression | null>(null);

  // Expression State Machine based on dialogue lifecycle & volume
  useEffect(() => {
    if (manualOverride) {
      setCurrentExpression(manualOverride);
      return;
    }

    if (state === "disconnected") {
      setCurrentExpression("resting");
      return;
    }

    if (state === "connecting") {
      setCurrentExpression("attentive");
      return;
    }

    if (state === "listening") {
      setCurrentExpression("attentive");
      return;
    }

    if (state === "speaking") {
      if (outputVolume > 0.45) {
        setCurrentExpression("winking");
      } else {
        setCurrentExpression("cheerful");
      }
    }
  }, [state, outputVolume, manualOverride]);

  // Timed expression variation during sustained speaking
  useEffect(() => {
    if (state !== "speaking" || manualOverride) return;

    const interval = setInterval(() => {
      setCurrentExpression((prev) => (prev === "cheerful" ? "winking" : "cheerful"));
    }, 3800);

    return () => clearInterval(interval);
  }, [state, manualOverride]);

  // Active audio volume for reactivity
  const activeVolume = state === "speaking" ? outputVolume : inputVolume;

  const currentHologramItem = getHologramForExpression(currentExpression);
  const isVideo = currentHologramItem?.mimeType.startsWith("video");

  // Telemetry stream data for connecting state
  const connectingLogs = [
    "SYS_INIT: NEURAL_BRIDGE_OK",
    "PCM_STREAM: 16000HZ_MONO",
    "KORE_VOICE_CORE: ONLINE",
    "GEMINI_3.1_LIVE: LINKED",
    "HOLO_BUFFER: CALIBRATING",
    "EXPRESSION_SM: ACTIVE",
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center select-none py-2 px-4">
      {/* 1. Hologram Outer Glow Aura with Subtle Living Pulse in Connected State */}
      {/* Ambient Outer Breathing Corona */}
      <motion.div
        className="absolute rounded-full pointer-events-none filter blur-3xl -z-20 transition-colors duration-700"
        style={{
          width: "500px",
          height: "640px",
          background: `radial-gradient(ellipse at center, rgba(${currentTheme.primaryRgb}, ${
            state === "speaking" ? 0.32 : state !== "disconnected" ? 0.22 : 0.08
          }) 0%, rgba(${currentTheme.secondaryRgb}, ${
            state === "speaking" ? 0.16 : state !== "disconnected" ? 0.1 : 0.03
          }) 45%, rgba(0,0,0,0) 75%)`,
        }}
        animate={
          state !== "disconnected"
            ? {
                scale: [1, 1.07 + activeVolume * 0.16, 0.98, 1.05 + activeVolume * 0.12, 1],
                opacity: state === "speaking" ? [0.7, 0.95, 0.65, 0.9, 0.7] : [0.5, 0.8, 0.45, 0.75, 0.5],
              }
            : {
                scale: [0.98, 1.02, 0.98],
                opacity: [0.2, 0.3, 0.2],
              }
        }
        transition={{
          duration: state === "speaking" ? 2.2 : state !== "disconnected" ? 3.4 : 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Core Focused Pulsing Glow Wrapper */}
      <motion.div
        className="absolute rounded-full pointer-events-none filter blur-2xl -z-10 transition-colors duration-500"
        style={{
          width: "420px",
          height: "560px",
          background:
            state === "speaking"
              ? `radial-gradient(ellipse at center, rgba(${currentTheme.primaryRgb}, 0.38) 0%, rgba(${currentTheme.secondaryRgb}, 0.2) 48%, rgba(0,0,0,0) 75%)`
              : state === "listening"
              ? `radial-gradient(ellipse at center, rgba(${currentTheme.primaryRgb}, 0.3) 0%, rgba(${currentTheme.secondaryRgb}, 0.15) 50%, rgba(0,0,0,0) 75%)`
              : state === "connecting"
              ? `radial-gradient(ellipse at center, rgba(${currentTheme.primaryRgb}, 0.2) 0%, rgba(${currentTheme.secondaryRgb}, 0.09) 50%, rgba(0,0,0,0) 75%)`
              : `radial-gradient(ellipse at center, rgba(${currentTheme.primaryRgb}, 0.1) 0%, rgba(${currentTheme.secondaryRgb}, 0.05) 60%, rgba(0,0,0,0) 80%)`,
        }}
        animate={
          state !== "disconnected"
            ? {
                scale: [1, 1.05 + activeVolume * 0.22, 0.99, 1.04 + activeVolume * 0.18, 1],
                opacity: state === "speaking" ? [0.8, 1.0, 0.75, 0.95, 0.8] : [0.65, 0.9, 0.62, 0.85, 0.65],
              }
            : {
                scale: [0.98, 1.02, 0.98],
                opacity: [0.25, 0.35, 0.25],
              }
        }
        transition={{
          duration: state === "speaking" ? 1.8 : state !== "disconnected" ? 2.8 : 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.15,
        }}
      />

      {/* 2. Holographic Projection Canvas Frame */}
      <div className="relative w-full max-w-[380px] h-[50vh] min-h-[320px] max-h-[640px] flex items-center justify-center mt-4 sm:mt-0">
        {/* Hologram Projector Pedestal Base at feet */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[80%] max-w-[280px] h-20 pointer-events-none flex items-center justify-center">
          {/* Base Rings */}
          <div
            className="absolute inset-0 rounded-[100%] border bg-gradient-to-t blur-[1px]"
            style={{
              borderColor: `rgba(${currentTheme.primaryRgb}, 0.35)`,
              backgroundImage: `linear-gradient(to top, rgba(${currentTheme.primaryRgb}, 0.22), transparent)`,
            }}
          />
          <div
            className="absolute inset-2 rounded-[100%] border animate-spin-slow"
            style={{ borderColor: `rgba(${currentTheme.primaryRgb}, 0.5)` }}
          />
          <div
            className="absolute inset-5 rounded-[100%] border border-dashed"
            style={{ borderColor: `rgba(${currentTheme.secondaryRgb}, 0.4)` }}
          />
          {/* Vertical Projector Light Cone */}
          <div
            className="absolute bottom-6 w-[80%] h-64 pointer-events-none"
            style={{
              clipPath: "polygon(20% 100%, 80% 100%, 100% 0%, 0% 0%)",
              background: `linear-gradient(to top, rgba(${currentTheme.primaryRgb}, 0.2), rgba(${currentTheme.secondaryRgb}, 0.06) 60%, transparent)`,
            }}
          />
        </div>

        {/* Floating Holographic Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: i % 3 === 0 ? "3px" : "2px",
                height: i % 3 === 0 ? "3px" : "2px",
                left: `${15 + (i * 7) % 70}%`,
                bottom: `${(i * 12) % 90}%`,
                backgroundColor: currentTheme.primary,
                boxShadow: `0 0 6px ${currentTheme.glow}`,
              }}
              animate={{
                y: [0, -70, -140],
                opacity: [0, 0.9, 0],
                x: [0, (i % 2 === 0 ? 8 : -8), 0],
              }}
              transition={{
                duration: 3 + (i % 4),
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Central Character Hologram Wrapper */}
        <motion.div
          className={`relative w-full h-full rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-500 ${
            state === "disconnected"
              ? "opacity-60 holo-breathe holo-glow-dim"
              : state === "speaking"
              ? "opacity-100 holo-float holo-glow-emerald"
              : state === "listening"
              ? "opacity-100 holo-float holo-glow-cyan"
              : "opacity-90 holo-flicker holo-glow-cyan"
          }`}
          animate={{
            scale: state === "speaking" ? 1 + outputVolume * 0.05 : 1,
          }}
          transition={{ duration: 0.12 }}
        >
          {/* USER CUSTOM HOLOGRAM (Persistent on device) */}
          {hasAnyHologram && currentHologramItem ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-full">
              {isVideo ? (
                <video
                  key={currentHologramItem.url}
                  src={currentHologramItem.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover object-center select-none mix-blend-screen transition-opacity duration-700 ease-in-out"
                />
              ) : (
                <img
                  key={currentHologramItem.url}
                  src={currentHologramItem.url}
                  alt={`Custom Hologram ${currentExpression}`}
                  className="w-full h-full object-cover object-center select-none mix-blend-screen transition-opacity duration-700 ease-in-out"
                />
              )}
            </div>
          ) : (
            /* SCI-FI HOLOGRAPHIC CORE EMITTER (Clean Holographic Core Icon) */
            <div className="relative w-full h-full flex items-center justify-center z-10 pointer-events-none select-none">
              {/* Concentric Pulsing Cyber Core Rings with Theme Glow */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                {/* Outermost Dashed Orbital Ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-dashed"
                  style={{
                    borderColor: `rgba(${currentTheme.primaryRgb}, 0.35)`,
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
                />
                {/* Secondary Breathing Geometric Ring */}
                <motion.div
                  className="absolute inset-4 rounded-full border"
                  style={{
                    borderColor: `rgba(${currentTheme.primaryRgb}, 0.5)`,
                    boxShadow: `0 0 16px rgba(${currentTheme.primaryRgb}, 0.25)`,
                  }}
                  animate={{
                    scale:
                      state === "speaking" || state === "listening"
                        ? [1, 1.08 + activeVolume * 0.22, 1]
                        : [1, 1.03, 1],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Counter-rotating Inner Dashed Ring */}
                <motion.div
                  className="absolute inset-9 rounded-full border border-dashed"
                  style={{
                    borderColor: `rgba(${currentTheme.secondaryRgb}, 0.5)`,
                  }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                />

                {/* Glowing Central Core Orb */}
                <motion.div
                  className="w-22 h-22 sm:w-24 sm:h-24 rounded-full backdrop-blur-md border flex items-center justify-center"
                  style={{
                    background: `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.25) 0%, rgba(${currentTheme.secondaryRgb}, 0.12) 65%, transparent 100%)`,
                    borderColor: `rgba(${currentTheme.primaryRgb}, 0.7)`,
                  }}
                  animate={{
                    scale: 1 + activeVolume * 0.35,
                    boxShadow:
                      state === "speaking"
                        ? `0 0 45px rgba(${currentTheme.primaryRgb}, 0.85)`
                        : state === "listening"
                        ? `0 0 35px rgba(${currentTheme.primaryRgb}, 0.65)`
                        : `0 0 24px rgba(${currentTheme.primaryRgb}, 0.35)`,
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <Sparkles
                    className="w-9 h-9 animate-pulse"
                    style={{
                      color: currentTheme.primary,
                      filter: `drop-shadow(0 0 10px ${currentTheme.primary})`,
                    }}
                  />
                </motion.div>
              </div>
            </div>
          )}

          {/* Connecting State Data-Stream Overlay */}
          {state === "connecting" && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-4">
              <div className="w-14 h-14 rounded-full border-2 border-white/40 border-t-white animate-spin flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h4 className="text-xs font-mono font-bold tracking-widest text-white uppercase animate-pulse">
                INITIALIZING NEURAL LINK
              </h4>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">
                Connecting to Gemini Live 3.1
              </p>
              {/* Scrolling Telemetry Matrix */}
              <div className="mt-4 w-52 h-20 overflow-hidden font-mono text-[9px] text-zinc-400 border border-white/20 bg-black/60 rounded p-2 select-none">
                {connectingLogs.map((log, idx) => (
                  <div key={idx} className="truncate">
                    &gt; {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Translucent Holographic Scanlines Overlay */}
          <div className="absolute inset-0 holo-scanlines pointer-events-none opacity-40 mix-blend-overlay z-20" />

          {/* Subtle Sci-Fi Corner Bracket Accents */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/60 z-20 pointer-events-none" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/60 z-20 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white/60 z-20 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/60 z-20 pointer-events-none" />
        </motion.div>

        {/* 3. Floating Sci-Fi HUD Panels Surrounding Myraa */}

        {/* Top-Left: System Connection Status Marker */}
        <div className="absolute -top-3 left-0 z-30 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 border border-white/30 backdrop-blur-md shadow-lg shadow-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                state === "disconnected"
                  ? "bg-zinc-500"
                  : state === "connecting"
                  ? "bg-white animate-pulse"
                  : "bg-white animate-pulse"
              }`}
            />
            <span className="text-[10px] font-mono font-semibold tracking-wider text-white uppercase">
              {state === "disconnected" ? "OFFLINE - STANDBY" : state}
            </span>
          </div>
        </div>

        {/* Top-Right: Audio Engine & Frequency Rate Marker */}
        <div className="absolute -top-3 right-0 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 border border-white/30 backdrop-blur-md shadow-lg shadow-white/10">
            <Radio className="w-3 h-3 text-white" />
            <span className="text-[10px] font-mono text-zinc-300">
              {state === "speaking" ? "PCM 24kHz" : "PCM 16kHz"}
            </span>
          </div>
        </div>

        {/* Left Side: Floating Sci-Fi Telemetry Panel */}
        <div className="absolute left-[-18px] sm:left-[-35px] top-1/3 -translate-y-1/2 z-30 pointer-events-none hidden xs:flex flex-col gap-2 font-mono text-[9px] text-zinc-300 bg-black/85 border border-white/30 rounded-xl p-2.5 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-1.5 text-white font-bold border-b border-white/20 pb-1">
            <Activity className="w-3 h-3 text-white" />
            <span>NEURAL SYNC</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-zinc-500">MASTER: <span className="text-white font-semibold">{isOwnerConfigured ? ownerName : "LOCKED"}</span></p>
            <p className="text-zinc-500">API KEY: <span className="text-white">{isOwnerConfigured ? "OWNER KEY" : "REQUIRED"}</span></p>
            <p className="text-zinc-500">HOLOGRAM: <span className="text-white">{hasAnyHologram ? "CUSTOM LOADED" : "CORE EMITTER"}</span></p>
            <p className="text-zinc-500">VOICE: <span className="text-white">Kore</span></p>
          </div>
        </div>

        {/* Right Side: Audio Frequency Waveform Bars */}
        <div className="absolute right-[-18px] sm:right-[-35px] top-1/3 -translate-y-1/2 z-30 pointer-events-none hidden xs:flex flex-col items-center gap-1 bg-black/85 border border-white/30 rounded-xl p-2.5 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-white border-b border-white/20 pb-1 mb-1">
            <Waves className="w-3 h-3 text-white" />
            <span>FREQ</span>
          </div>
          {/* Dynamic frequency visualizer bars */}
          <div className="flex items-end gap-1 h-14 px-1">
            {[0, 2, 4, 6, 8, 10, 12, 14].map((barIdx) => {
              const freqVal = frequencies[barIdx] || (activeVolume * 255 * (0.4 + (barIdx % 3) * 0.2));
              const heightPct = Math.min(100, Math.max(12, (freqVal / 255) * 100));
              return (
                <motion.div
                  key={barIdx}
                  className="w-1.5 rounded-full bg-gradient-to-t from-white to-zinc-400 shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                  style={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.05 }}
                />
              );
            })}
          </div>
        </div>

        {/* Central Lower HUD: Primary Interaction Reticle & Mic Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={onToggleConnect}
            className={`relative group w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              state === "speaking"
                ? "bg-white text-black shadow-white/40 border-2 border-white"
                : state === "listening"
                ? "bg-white text-black shadow-white/40 border-2 border-zinc-200"
                : state === "connecting"
                ? "bg-zinc-800 text-white shadow-zinc-500/30"
                : "bg-black text-white border-2 border-white/40 hover:border-white shadow-white/10"
            }`}
            title={state === "disconnected" ? "Initialize Simi Hologram" : "Disconnect Session"}
          >
            {/* Spinning reticle border */}
            <div
              className={`absolute inset-[-6px] rounded-full border border-dashed pointer-events-none transition-colors ${
                state === "speaking"
                  ? "border-white/60 animate-spin-slow"
                  : state === "listening"
                  ? "border-white/60 animate-spin-slow"
                  : "border-zinc-700"
              }`}
            />

            {state === "disconnected" ? (
              <Power className="w-7 h-7" />
            ) : isMuted ? (
              <MicOff className="w-7 h-7 text-zinc-500" />
            ) : state === "speaking" ? (
              <Volume2 className="w-7 h-7 animate-pulse" />
            ) : (
              <Mic className="w-7 h-7 animate-pulse" />
            )}
          </motion.button>

          {/* Reticle Label */}
          <div className="px-3 py-0.5 rounded-full bg-black border border-white/30 text-[10px] font-mono text-white uppercase tracking-wider backdrop-blur-md">
            {state === "speaking"
              ? "SIMI SPEAKING"
              : state === "listening"
              ? "SIMI LISTENING"
              : state === "connecting"
              ? "CONNECTING..."
              : "TAP TO START"}
          </div>
        </div>
      </div>

      {/* 4. Interactive Micro-Expression Switcher HUD (when custom holograms are uploaded) */}
      <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap z-30">
        <span className="text-[10px] font-mono text-zinc-400 mr-1 flex items-center gap-1">
          <Eye className="w-3 h-3 text-zinc-400" />
          EXPRESSION:
        </span>

        {[
          { id: "attentive", label: "Attentive", icon: Eye },
          { id: "cheerful", label: "Cheerful", icon: Smile },
          { id: "winking", label: "Wink", icon: SmilePlus },
          { id: "resting", label: "Resting", icon: Radio },
        ].map((exp) => {
          const isActive = currentExpression === exp.id;
          const Icon = exp.icon;
          const hasCustom = Boolean(holograms[exp.id as AnimeExpression]);

          return (
            <button
              key={exp.id}
              onClick={() => {
                setManualOverride(exp.id as AnimeExpression);
                setTimeout(() => setManualOverride(null), 5000);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                isActive
                  ? "bg-white/20 text-white border-white/50 shadow-sm shadow-white/20"
                  : "bg-black/60 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-500/30"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{exp.label}</span>
              {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
