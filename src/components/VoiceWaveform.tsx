import React, { useEffect, useRef } from "react";
import { AssistantState } from "../types";

interface VoiceWaveformProps {
  state: AssistantState;
  frequencies: number[];
  volume: number;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  state,
  frequencies,
  volume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothedFreqs = useRef<number[]>(new Array(32).fill(0));
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      phaseRef.current += 0.04;
      const phase = phaseRef.current;

      // Smooth interpolation for frequencies
      const targetFreqs = frequencies && frequencies.length > 0 ? frequencies : new Array(32).fill(0);
      for (let i = 0; i < 32; i++) {
        const target = targetFreqs[i] || 0;
        smoothedFreqs.current[i] += (target - smoothedFreqs.current[i]) * 0.25;
      }

      const activeVolume = Math.max(0.04, volume);
      const isSpeaking = state === "speaking";
      const isListening = state === "listening";

      // Color palette based on state
      let primaryColor = "rgba(148, 163, 184, 0.2)";
      let glowColor = "rgba(148, 163, 184, 0.1)";

      if (isSpeaking) {
        primaryColor = "rgba(236, 72, 153, 0.85)";
        glowColor = "rgba(168, 85, 247, 0.5)";
      } else if (isListening) {
        primaryColor = "rgba(6, 182, 212, 0.85)";
        glowColor = "rgba(59, 130, 246, 0.5)";
      } else if (state === "connecting") {
        primaryColor = "rgba(192, 132, 252, 0.7)";
        glowColor = "rgba(99, 102, 241, 0.4)";
      }

      // Draw multi-layered glowing acoustic waves
      const waveLayers = [
        { amplitudeMult: 1.0, speed: 1.0, alpha: 0.85, lineWidth: 3 },
        { amplitudeMult: 0.6, speed: -1.3, alpha: 0.45, lineWidth: 2 },
        { amplitudeMult: 0.35, speed: 0.7, alpha: 0.25, lineWidth: 1.5 },
      ];

      waveLayers.forEach((layer) => {
        ctx.beginPath();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = layer.lineWidth;
        ctx.shadowBlur = isSpeaking || isListening ? 14 : 4;
        ctx.shadowColor = glowColor;

        const points = 32;
        const sliceWidth = width / (points - 1);

        for (let i = 0; i < points; i++) {
          const x = i * sliceWidth;
          const freqVal = smoothedFreqs.current[i] || 0;

          // Compute harmonic displacement
          const sinMod = Math.sin(phase * layer.speed + (i * 0.4));
          const cosMod = Math.cos(phase * 0.5 + (i * 0.2));

          const maxAmp = (height * 0.38) * layer.amplitudeMult;
          const dynamicAmp = maxAmp * (freqVal * 1.5 + activeVolume * 0.8);
          const baselineOffset = Math.sin(phase + (i * 0.2)) * 4;

          const y = centerY + (sinMod * dynamicAmp) + (cosMod * baselineOffset);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (i - 1) * sliceWidth;
            const midX = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, y, midX, y);
          }
        }

        ctx.stroke();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, frequencies, volume]);

  return (
    <div className="w-full max-w-md h-20 relative flex items-center justify-center pointer-events-none">
      <canvas
        ref={canvasRef}
        width={420}
        height={80}
        className="w-full h-full object-contain"
      />
    </div>
  );
};
