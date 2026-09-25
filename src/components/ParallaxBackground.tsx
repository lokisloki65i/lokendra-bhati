import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { AssistantState } from "../types";
import { useTheme } from "../services/ThemeContext";

interface ParallaxBackgroundProps {
  state: AssistantState;
}

export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ state }) => {
  const { currentTheme } = useTheme();
  // Motion values for normalized mouse position (-1 to 1)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth physics spring configurations for organic, lag-free parallax
  const springConfigSlow = { damping: 25, stiffness: 80, mass: 1.2 };
  const springConfigMed = { damping: 20, stiffness: 100, mass: 0.8 };
  const springConfigFast = { damping: 18, stiffness: 140, mass: 0.5 };

  const smoothXSlow = useSpring(mouseX, springConfigSlow);
  const smoothYSlow = useSpring(mouseY, springConfigSlow);

  const smoothXMed = useSpring(mouseX, springConfigMed);
  const smoothYMed = useSpring(mouseY, springConfigMed);

  const smoothXFast = useSpring(mouseX, springConfigFast);
  const smoothYFast = useSpring(mouseY, springConfigFast);

  // Direct cursor coordinates for interactive spotlight
  const cursorX = useMotionValue(typeof window !== "undefined" ? window.innerWidth / 2 : 500);
  const cursorY = useMotionValue(typeof window !== "undefined" ? window.innerHeight / 2 : 400);
  const smoothCursorX = useSpring(cursorX, { damping: 24, stiffness: 120 });
  const smoothCursorY = useSpring(cursorY, { damping: 24, stiffness: 120 });

  // Layer 1: Top-left subtle glow (slow opposing parallax)
  const layer1X = useTransform(smoothXSlow, [-1, 1], [35, -35]);
  const layer1Y = useTransform(smoothYSlow, [-1, 1], [30, -30]);

  // Layer 2: Bottom-right cyber cyan glow (medium direct parallax)
  const layer2X = useTransform(smoothXMed, [-1, 1], [-45, 45]);
  const layer2Y = useTransform(smoothYMed, [-1, 1], [-40, 40]);

  // Layer 3: Central atmospheric core glow (subtle direct parallax)
  const layer3X = useTransform(smoothXFast, [-1, 1], [-25, 25]);
  const layer3Y = useTransform(smoothYFast, [-1, 1], [-20, 20]);

  // Layer 4: Floating auxiliary accent orb (high-depth parallax)
  const layer4X = useTransform(smoothXFast, [-1, 1], [50, -50]);
  const layer4Y = useTransform(smoothYFast, [-1, 1], [-50, 50]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      // Calculate normalized coords between -1 and 1
      const normX = (e.clientX / innerWidth) * 2 - 1;
      const normY = (e.clientY / innerHeight) * 2 - 1;
      mouseX.set(normX);
      mouseY.set(normY);

      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, cursorX, cursorY]);

  return (
    <div
      id="parallax-ambient-backdrop"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Dynamic Cursor Spotlight Glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none filter blur-[90px] transition-opacity duration-700 opacity-60"
        style={{
          left: smoothCursorX,
          top: smoothCursorY,
          background:
            state === "speaking"
              ? "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(200,200,200,0.1) 45%, transparent 75%)"
              : state === "listening"
              ? "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(150,150,150,0.1) 45%, transparent 75%)"
              : state === "connecting"
              ? "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(100,100,100,0.1) 45%, transparent 75%)"
              : "radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(50,50,50,0.06) 45%, transparent 75%)",
        }}
      />

      {/* 2. Layer 1: Top-Left Ambient Gradient Orb */}
      <motion.div
        className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full filter blur-[120px] transition-colors duration-1000"
        style={{
          x: layer1X,
          y: layer1Y,
          background:
            state === "speaking"
              ? `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.22) 0%, rgba(${currentTheme.primaryRgb}, 0.1) 60%, transparent 80%)`
              : state === "listening"
              ? `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.16) 0%, rgba(${currentTheme.primaryRgb}, 0.08) 60%, transparent 80%)`
              : `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.1) 0%, rgba(${currentTheme.primaryRgb}, 0.04) 60%, transparent 80%)`,
        }}
      />

      {/* 3. Layer 2: Bottom-Right Neon Ambient Gradient Orb */}
      <motion.div
        className="absolute -bottom-36 -right-36 w-[520px] h-[520px] rounded-full filter blur-[130px] transition-colors duration-1000"
        style={{
          x: layer2X,
          y: layer2Y,
          background:
            state === "speaking"
              ? `radial-gradient(circle, rgba(${currentTheme.secondaryRgb}, 0.22) 0%, rgba(${currentTheme.secondaryRgb}, 0.1) 60%, transparent 80%)`
              : state === "listening"
              ? `radial-gradient(circle, rgba(${currentTheme.secondaryRgb}, 0.16) 0%, rgba(${currentTheme.secondaryRgb}, 0.08) 60%, transparent 80%)`
              : `radial-gradient(circle, rgba(${currentTheme.secondaryRgb}, 0.1) 0%, rgba(${currentTheme.secondaryRgb}, 0.04) 60%, transparent 80%)`,
        }}
      />

      {/* 4. Layer 3: Central Ambient Light Core */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full filter blur-[140px] transition-colors duration-1000"
        style={{
          x: layer3X,
          y: layer3Y,
          background:
            state === "speaking"
              ? `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.16) 0%, rgba(${currentTheme.secondaryRgb}, 0.08) 50%, transparent 75%)`
              : state === "listening"
              ? `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.14) 0%, rgba(${currentTheme.secondaryRgb}, 0.06) 50%, transparent 75%)`
              : `radial-gradient(circle, rgba(${currentTheme.primaryRgb}, 0.06) 0%, transparent 75%)`,
        }}
      />

      {/* 5. Layer 4: Upper-Right Secondary Cosmic Accent */}
      <motion.div
        className="absolute top-1/4 -right-24 w-[380px] h-[380px] rounded-full filter blur-[110px] transition-colors duration-1000"
        style={{
          x: layer4X,
          y: layer4Y,
          background:
            state === "speaking"
              ? `radial-gradient(circle, rgba(${currentTheme.secondaryRgb}, 0.18) 0%, rgba(${currentTheme.primaryRgb}, 0.08) 60%, transparent 80%)`
              : state === "listening"
              ? `radial-gradient(circle, rgba(${currentTheme.secondaryRgb}, 0.14) 0%, rgba(${currentTheme.primaryRgb}, 0.06) 60%, transparent 80%)`
              : `radial-gradient(circle, rgba(${currentTheme.secondaryRgb}, 0.06) 0%, transparent 80%)`,
        }}
      />

      {/* 6. Subtle Cyber Grid Overlay for spatial depth */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
        }}
      />
    </div>
  );
};
