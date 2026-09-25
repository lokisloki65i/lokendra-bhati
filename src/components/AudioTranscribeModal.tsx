import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Square, Upload, Copy, Check, Sparkles, Loader2, X, ExternalLink, Play } from "lucide-react";
import { TranscribeResponse } from "../types";
import { useOwner } from "../services/OwnerContext";

interface AudioTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectOpenUrl?: (url: string, title?: string) => void;
}

export const AudioTranscribeModal: React.FC<AudioTranscribeModalProps> = ({
  isOpen,
  onClose,
  onDirectOpenUrl,
}) => {
  const { ownerConfig } = useOwner();
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      setError(null);
      setTranscription(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await processAudioForTranscription(audioBlob, mimeType);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[Record Error]:", err);
      setError(err?.message || "Could not access microphone.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudioForTranscription = async (blob: Blob, mimeType: string) => {
    setLoading(true);
    setError(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);

      const audioBase64 = await base64Promise;

      const response = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: mimeType.split(";")[0],
          prompt: "Transcribe the spoken audio with high accuracy, preserving natural language and Indian English/Hindi terms if any.",
          apiKey: ownerConfig.apiKey,
        }),
      });

      const data: TranscribeResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Audio transcription failed.");
      }

      setTranscription(data.transcription);

      // Auto-detect open command in transcribed text
      const lower = data.transcription.toLowerCase();
      if (lower.includes("open youtube") || lower.includes("open yt")) {
        onDirectOpenUrl?.("https://www.youtube.com", "YouTube");
      } else if (lower.includes("open google")) {
        onDirectOpenUrl?.("https://www.google.com", "Google");
      } else if (lower.includes("open spotify")) {
        onDirectOpenUrl?.("https://open.spotify.com", "Spotify");
      } else if (lower.includes("open github")) {
        onDirectOpenUrl?.("https://github.com", "GitHub");
      }
    } catch (err: any) {
      console.error("[Transcription Error]:", err);
      setError(err?.message || "Failed to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAudioForTranscription(file, file.type || "audio/webm");
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Inspect transcription for direct launch triggers
  const detectedLaunch = (() => {
    if (!transcription) return null;
    const lower = transcription.toLowerCase();
    if (lower.includes("youtube") || lower.includes("yt")) {
      return { url: "https://www.youtube.com", label: "YouTube" };
    }
    if (lower.includes("google")) {
      return { url: "https://www.google.com", label: "Google" };
    }
    if (lower.includes("spotify")) {
      return { url: "https://open.spotify.com", label: "Spotify" };
    }
    if (lower.includes("github")) {
      return { url: "https://github.com", label: "GitHub" };
    }
    return null;
  })();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 p-[1px] shadow-lg shadow-purple-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Mic className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Audio Transcription</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    gemini-3.5-transcribe
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Transcribe microphone speech or uploaded audio with Gemini
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Microphone Recording Center */}
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
              {isRecording && (
                <div className="absolute inset-0 bg-rose-500/5 animate-pulse pointer-events-none" />
              )}

              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xl relative z-10 ${
                    isRecording
                      ? "bg-rose-500 text-white shadow-rose-500/30"
                      : "bg-gradient-to-tr from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400 shadow-purple-500/25"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8 fill-current" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white">
                  {isRecording ? "Listening to your voice..." : "Tap to start recording speech"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {isRecording ? (
                    <span className="font-mono text-rose-400 font-bold">
                      Recording: {formatDuration(recordDuration)}
                    </span>
                  ) : (
                    "Say 'Open YouTube', ask a question, or speak freely"
                  )}
                </p>
              </div>

              {/* Upload alternative */}
              <div className="pt-2 border-t border-slate-800/80 w-full flex items-center justify-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording || loading}
                  className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Or upload an audio file (.mp3, .wav, .m4a, .webm)</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={startRecording}
                  className="underline font-semibold ml-2 hover:text-rose-200"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-3 text-sm text-purple-300">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Transcribing with gemini-3.5-transcribe...</span>
              </div>
            )}

            {/* Transcription Output */}
            {transcription && !loading && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Transcribed Speech
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 leading-relaxed font-normal">
                  {transcription}
                </div>

                {/* Direct Voice Command Triggered Pill */}
                {detectedLaunch && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        Voice Command Detected
                      </span>
                      <p className="text-xs text-white font-medium mt-0.5">
                        Directly launch {detectedLaunch.label} in Chrome tab
                      </p>
                    </div>
                    <button
                      onClick={() => onDirectOpenUrl?.(detectedLaunch.url, detectedLaunch.label)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20 shrink-0"
                    >
                      <span>Direct Open</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>Model: gemini-3.5-transcribe</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
