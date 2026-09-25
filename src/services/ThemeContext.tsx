import React, { createContext, useContext, useState, useEffect } from "react";

export type HoloThemeId =
  | "cyber-blue"
  | "neon-pink"
  | "acid-green"
  | "solar-amber"
  | "neon-violet"
  | "pure-silver";

export interface HoloThemePreset {
  id: HoloThemeId;
  name: string;
  tag: string;
  primary: string;
  primaryRgb: string;
  secondary: string;
  secondaryRgb: string;
  glow: string;
  accent: string;
  previewGradient: string;
}

export const HOLO_THEMES: HoloThemePreset[] = [
  {
    id: "cyber-blue",
    name: "Cyber Blue",
    tag: "Cyan / Electric",
    primary: "#00f0ff",
    primaryRgb: "0, 240, 255",
    secondary: "#0066ff",
    secondaryRgb: "0, 102, 255",
    glow: "rgba(0, 240, 255, 0.45)",
    accent: "#38bdf8",
    previewGradient: "from-cyan-400 to-blue-600",
  },
  {
    id: "neon-pink",
    name: "Neon Pink",
    tag: "Synthwave / Rose",
    primary: "#ff007f",
    primaryRgb: "255, 0, 127",
    secondary: "#d946ef",
    secondaryRgb: "217, 70, 239",
    glow: "rgba(255, 0, 127, 0.45)",
    accent: "#f472b6",
    previewGradient: "from-pink-500 to-fuchsia-600",
  },
  {
    id: "acid-green",
    name: "Acid Green",
    tag: "Matrix / Emerald",
    primary: "#00ff66",
    primaryRgb: "0, 255, 102",
    secondary: "#10b981",
    secondaryRgb: "16, 185, 129",
    glow: "rgba(0, 255, 102, 0.45)",
    accent: "#4ade80",
    previewGradient: "from-emerald-400 to-green-600",
  },
  {
    id: "solar-amber",
    name: "Solar Amber",
    tag: "Sunset / Cyber Gold",
    primary: "#ffaa00",
    primaryRgb: "255, 170, 0",
    secondary: "#f97316",
    secondaryRgb: "249, 115, 22",
    glow: "rgba(255, 170, 0, 0.45)",
    accent: "#fbbf24",
    previewGradient: "from-amber-400 to-orange-600",
  },
  {
    id: "neon-violet",
    name: "Neon Violet",
    tag: "Void / Amethyst",
    primary: "#a855f7",
    primaryRgb: "168, 85, 247",
    secondary: "#ec4899",
    secondaryRgb: "236, 72, 153",
    glow: "rgba(168, 85, 247, 0.45)",
    accent: "#c084fc",
    previewGradient: "from-purple-500 to-pink-600",
  },
  {
    id: "pure-silver",
    name: "Pure Silver",
    tag: "Monolith / Minimal",
    primary: "#ffffff",
    primaryRgb: "255, 255, 255",
    secondary: "#94a3b8",
    secondaryRgb: "148, 163, 184",
    glow: "rgba(255, 255, 255, 0.4)",
    accent: "#e2e8f0",
    previewGradient: "from-zinc-100 to-zinc-400",
  },
];

interface ThemeContextType {
  currentTheme: HoloThemePreset;
  themeId: HoloThemeId;
  setTheme: (id: HoloThemeId) => void;
  themes: HoloThemePreset[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "myraa_holo_theme_preset";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<HoloThemeId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as HoloThemeId | null;
      if (saved && HOLO_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    }
    return "cyber-blue";
  });

  const currentTheme = HOLO_THEMES.find((t) => t.id === themeId) || HOLO_THEMES[0];

  useEffect(() => {
    // Save to local storage for persistence across reloads
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // ignore
    }

    // Apply CSS variables to root document
    const root = document.documentElement;
    root.style.setProperty("--holo-primary", currentTheme.primary);
    root.style.setProperty("--holo-primary-rgb", currentTheme.primaryRgb);
    root.style.setProperty("--holo-secondary", currentTheme.secondary);
    root.style.setProperty("--holo-secondary-rgb", currentTheme.secondaryRgb);
    root.style.setProperty("--holo-glow", currentTheme.glow);
    root.style.setProperty("--holo-glow-strong", `rgba(${currentTheme.primaryRgb}, 0.85)`);
    root.style.setProperty("--holo-border", `rgba(${currentTheme.primaryRgb}, 0.35)`);
    root.style.setProperty(
      "--holo-bg-radial",
      `radial-gradient(ellipse at center, rgba(${currentTheme.primaryRgb}, 0.22) 0%, rgba(${currentTheme.secondaryRgb}, 0.1) 45%, rgba(0,0,0,0) 75%)`
    );

    root.setAttribute("data-holo-theme", currentTheme.id);
  }, [currentTheme, themeId]);

  const setTheme = (id: HoloThemeId) => {
    if (HOLO_THEMES.some((t) => t.id === id)) {
      setThemeId(id);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeId,
        setTheme,
        themes: HOLO_THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
