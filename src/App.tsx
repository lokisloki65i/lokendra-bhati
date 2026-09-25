import { useEffect, useRef, useState } from "react";
import { StateManager, AppState } from "./services/StateManager";
import { ToolManager } from "./services/ToolManager";
import { LiveSession } from "./services/LiveSession";
import { AvatarRenderer } from "./components/AvatarRenderer";
import { StatusBadge } from "./components/StatusBadge";
import { HeaderControls } from "./components/HeaderControls";
import { ControlsBar } from "./components/ControlsBar";
import { ToolActionCard } from "./components/ToolActionCard";
import { TimerWidget } from "./components/TimerWidget";
import { ParallaxBackground } from "./components/ParallaxBackground";
import { DirectOpenHUD } from "./components/DirectOpenHUD";
import { SearchGroundingModal } from "./components/SearchGroundingModal";
import { MapsGroundingModal } from "./components/MapsGroundingModal";
import { AudioTranscribeModal } from "./components/AudioTranscribeModal";
import { OwnerModal } from "./components/OwnerModal";
import { useOwner } from "./services/OwnerContext";

import { VideoBackground } from "./components/VideoBackground";
import { WebBrowser } from "./components/WebBrowser";
import { useVideoContext, ImageVideoUploader } from "./image";
import { ScreenShareManager } from "./services/ScreenShareManager";

export default function App() {
  const { ownerConfig, isOwnerConfigured } = useOwner();
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const stateManagerRef = useRef<StateManager | null>(null);
  const toolManagerRef = useRef<ToolManager | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const screenShareManagerRef = useRef<ScreenShareManager | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  if (!stateManagerRef.current) {
    stateManagerRef.current = new StateManager();
  }
  if (!toolManagerRef.current) {
    toolManagerRef.current = new ToolManager();
  }
  if (!screenShareManagerRef.current) {
    screenShareManagerRef.current = new ScreenShareManager(setIsScreenSharing);
  }
  if (!liveSessionRef.current) {
    liveSessionRef.current = new LiveSession(
      stateManagerRef.current,
      toolManagerRef.current
    );
  }

  const [appState, setAppState] = useState<AppState>(
    stateManagerRef.current.getState()
  );

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [transcribeModalOpen, setTranscribeModalOpen] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("https://www.google.com");

  const [visualizerData, setVisualizerData] = useState<{
    inputVolume: number;
    outputVolume: number;
    volume: number;
    frequencies: number[];
    source: "input" | "output" | "idle";
  }>({
    inputVolume: 0,
    outputVolume: 0,
    volume: 0,
    frequencies: new Array(32).fill(0),
    source: "idle",
  });

  // Subscribe to state manager
  useEffect(() => {
    if (appState.directOpenEvent) {
      setBrowserUrl(appState.directOpenEvent.url);
      setIsBrowserOpen(true);
      stateManagerRef.current?.dismissDirectOpenEvent();
    }
  }, [appState.directOpenEvent]);

  useEffect(() => {
    const unsub = stateManagerRef.current?.subscribe((next) => {
      setAppState(next);
    });
    return () => {
      unsub?.();
    };
  }, []);

  // Real-time audio visualizer polling loop
  useEffect(() => {
    let animId: number;
    const updateVisualizer = () => {
      if (liveSessionRef.current) {
        const detailed = liveSessionRef.current.getDetailedVisualizerData();
        const activeVol = detailed.source === "output" ? detailed.outputVolume : detailed.inputVolume;
        setVisualizerData({
          ...detailed,
          volume: activeVol,
        });
      }
      animId = requestAnimationFrame(updateVisualizer);
    };

    animId = requestAnimationFrame(updateVisualizer);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Global hotkeys for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === " " || e.key.toLowerCase() === "m") {
        e.preventDefault();
        liveSessionRef.current?.toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleConnect = () => {
    if (appState.assistantState === "disconnected") {
      // Require owner configuration
      if (!isOwnerConfigured || !ownerConfig.apiKey) {
        stateManagerRef.current?.setErrorMessage("Owner configuration required. Please enter password 'ggmrloki' in Owner Option and provide your personal Gemini API key.");
        setOwnerModalOpen(true);
        return;
      }
      liveSessionRef.current?.connect(ownerConfig.apiKey, ownerConfig.ownerName);
    } else {
      liveSessionRef.current?.disconnect();
    }
  };

  const handleToggleMute = () => {
    liveSessionRef.current?.toggleMute();
  };

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      screenShareManagerRef.current?.stopSharing();
    } else {
      screenShareManagerRef.current?.setLiveSession(liveSessionRef.current);
      screenShareManagerRef.current?.startSharing();
    }
  };

  const { setIsUploaderOpen } = useVideoContext();
  const handleDirectOpen = (url: string, title?: string) => {
    // Instead of window.open, use the built-in browser
    setBrowserUrl(url);
    setIsBrowserOpen(true);
    stateManagerRef.current?.dismissDirectOpenEvent();
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col justify-between relative overflow-hidden font-sans">
      <ImageVideoUploader />
      {/* Full Screen Video Background */}
      <VideoBackground />

      {/* Dynamic Mouse-Parallax Background Radial Gradients */}
      <ParallaxBackground state={appState.assistantState} />

      {/* Direct Open HUD for voice-triggered URL and App launches */}
      <DirectOpenHUD
        event={appState.directOpenEvent}
        onDismiss={() => stateManagerRef.current?.dismissDirectOpenEvent()}
      />

      {/* Web Browser Overlay */}
      <WebBrowser 
        isOpen={isBrowserOpen} 
        initialUrl={browserUrl} 
        onClose={() => setIsBrowserOpen(false)} 
      />
      {/* Header Bar */}
      <HeaderControls
        state={appState.assistantState}
        sessionDuration={appState.sessionDuration}
        latencyMs={appState.latencyMs}
        onOpenSearchGrounding={() => setSearchModalOpen(true)}
        onOpenMapsGrounding={() => setMapsModalOpen(true)}
        onOpenTranscribe={() => setTranscribeModalOpen(true)}
        onOpenVideoSetup={() => setIsUploaderOpen(true)}
        onOpenOwnerOption={() => setOwnerModalOpen(true)}
      />

      {/* Floating Interactive Tool Toasts */}
      <ToolActionCard
        tools={appState.recentTools}
        onDismiss={(id) => stateManagerRef.current?.dismissToolCall(id)}
      />

      {/* Floating Active Timers */}
      <TimerWidget
        timers={appState.activeTimers}
        onTogglePause={(id) => stateManagerRef.current?.togglePauseTimer(id)}
        onRemove={(id) => stateManagerRef.current?.removeTimer(id)}
      />

      {/* Central Visual Stage: Cyberpunk Anime Hologram Companion */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 z-20 max-w-2xl mx-auto w-full">
        {/* Status Badge */}
        <div className="mb-1 sm:mb-2">
          <StatusBadge
            state={appState.assistantState}
            isMuted={appState.isMuted}
            errorMessage={appState.errorMessage}
          />
        </div>

        {/* Central Anime Hologram Avatar with Dynamic Expressions & Voice Reactivity */}
        <AvatarRenderer
          state={appState.assistantState}
          inputVolume={visualizerData.inputVolume}
          outputVolume={visualizerData.outputVolume}
          frequencies={visualizerData.frequencies}
          isMuted={appState.isMuted}
          onToggleConnect={handleToggleConnect}
          onToggleMute={handleToggleMute}
        />
      </main>

      {/* Bottom Controls Dock */}
      <ControlsBar
        state={appState.assistantState}
        isMuted={appState.isMuted}
        onToggleMute={handleToggleMute}
        onToggleConnect={handleToggleConnect}
        onDirectOpenUrl={handleDirectOpen}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
      />

      {/* Google Search Grounding Modal (gemini-3.5-flash with googleSearch) */}
      <SearchGroundingModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Google Maps Grounding Modal (gemini-3.5-flash with googleMaps) */}
      <MapsGroundingModal
        isOpen={mapsModalOpen}
        onClose={() => setMapsModalOpen(false)}
      />

      {/* Microphone Audio Transcription Modal (gemini-3.5-transcribe) */}
      <AudioTranscribeModal
        isOpen={transcribeModalOpen}
        onClose={() => setTranscribeModalOpen(false)}
        onDirectOpenUrl={handleDirectOpen}
      />

      {/* Owner Option Modal (password protected: ggmrloki) */}
      <OwnerModal
        isOpen={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
        onConfigSaved={() => {
          if (appState.errorMessage?.includes("Owner configuration")) {
            stateManagerRef.current?.setErrorMessage(null);
          }
        }}
      />
    </div>
  );
}
