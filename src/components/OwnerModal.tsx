import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Key, User, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, X, Eye, EyeOff, Trash2 } from "lucide-react";
import { useOwner } from "../services/OwnerContext";
import { useTheme } from "../services/ThemeContext";

const OWNER_PASSWORD = "ggmrloki";

interface OwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const OwnerModal: React.FC<OwnerModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const { ownerConfig, setOwnerConfig, clearOwnerConfig, isOwnerConfigured } = useOwner();
  const { currentTheme } = useTheme();

  // Authentication gate state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Form values once inside
  const [apiKeyInput, setApiKeyInput] = useState(ownerConfig.apiKey || "");
  const [ownerNameInput, setOwnerNameInput] = useState(ownerConfig.ownerName || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (enteredPassword === OWNER_PASSWORD) {
      setIsAuthenticated(true);
      setApiKeyInput(ownerConfig.apiKey || "");
      setOwnerNameInput(ownerConfig.ownerName || "");
    } else {
      setPasswordError("Access denied. Invalid password.");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const key = apiKeyInput.trim();
    const name = ownerNameInput.trim();

    if (!key) {
      setValidationError("Gemini API key is required. The app exclusively runs on this key.");
      return;
    }

    if (!name) {
      setValidationError("Owner/Master name is required so Simi recognizes you.");
      return;
    }

    // Basic format check for Gemini key
    if (key.length < 20) {
      setValidationError("API key appears too short. Please provide a valid Google Gemini API key.");
      return;
    }

    setOwnerConfig({ apiKey: key, ownerName: name });
    setSaveSuccess(true);
    if (onConfigSaved) onConfigSaved();

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const handleResetOwner = () => {
    if (window.confirm("Are you sure you want to remove your Owner profile and API key? The app will require configuration before running again.")) {
      clearOwnerConfig();
      setApiKeyInput("");
      setOwnerNameInput("");
      setValidationError(null);
      if (onConfigSaved) onConfigSaved();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-2xl bg-zinc-950/95 border border-white/20 shadow-2xl p-6 overflow-hidden text-white font-sans"
        >
          {/* Subtle themed ambient glow */}
          <div
            className="absolute -top-24 -right-24 w-52 h-52 rounded-full pointer-events-none filter blur-3xl opacity-30"
            style={{ background: currentTheme.primary }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {!isAuthenticated ? (
            /* STEP 1: PASSWORD GATE */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `rgba(${currentTheme.primaryRgb}, 0.15)`,
                    borderColor: `rgba(${currentTheme.primaryRgb}, 0.4)`,
                  }}
                >
                  <Lock className="w-5 h-5" style={{ color: currentTheme.primary }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide font-['Outfit']">
                    OWNER ACCESS PORTAL
                  </h3>
                  <p className="text-xs text-zinc-400">Security Clearance Required</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 leading-relaxed">
                Enter the master password to access Owner settings, configure your personal Gemini API key, and register your identity as Master.
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-medium">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      autoFocus
                      value={enteredPassword}
                      onChange={(e) => setEnteredPassword(e.target.value)}
                      placeholder="Enter password..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/20 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white transition-all font-mono"
                    />
                  </div>
                  {passwordError && (
                    <div className="flex items-center gap-1.5 mt-2 text-rose-400 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-black font-semibold text-xs transition-all active:scale-95 shadow-lg"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    Authorize
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STEP 2: OWNER SETTINGS FORM */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `rgba(${currentTheme.primaryRgb}, 0.15)`,
                    borderColor: `rgba(${currentTheme.primaryRgb}, 0.4)`,
                  }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: currentTheme.primary }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide font-['Outfit']">
                    OWNER CONFIGURATION
                  </h3>
                  <p className="text-xs text-zinc-400">Exclusive API Key & Master Identity</p>
                </div>
              </div>

              {/* Status info callout */}
              <div
                className="p-3 rounded-xl border text-xs leading-relaxed"
                style={{
                  backgroundColor: isOwnerConfigured ? `rgba(${currentTheme.primaryRgb}, 0.08)` : "rgba(239, 68, 68, 0.1)",
                  borderColor: isOwnerConfigured ? `rgba(${currentTheme.primaryRgb}, 0.3)` : "rgba(239, 68, 68, 0.3)",
                  color: isOwnerConfigured ? "#e2e8f0" : "#fca5a5",
                }}
              >
                {isOwnerConfigured ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Active Master: <strong className="text-white">{ownerConfig.ownerName}</strong>. The app exclusively runs on your provided API key.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      App is locked. You must provide your Gemini API key and name below. No other API keys will be used.
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-3.5">
                {/* Master Name Input */}
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Your Name (Recognized as Master)</span>
                  </label>
                  <input
                    type="text"
                    value={ownerNameInput}
                    onChange={(e) => setOwnerNameInput(e.target.value)}
                    placeholder="e.g. Loki, Lokendra, Master Alex"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/20 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white transition-all"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Simi will immediately recognize you as her Master and address you with absolute loyalty.
                  </p>
                </div>

                {/* Gemini API Key Input */}
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5 font-medium flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Your Google Gemini API Key</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-zinc-500 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showApiKey ? "Hide" : "Show"}</span>
                    </button>
                  </label>
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/20 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-white transition-all font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Saved exclusively into your browser device storage. The server will reject calls without your active key.
                  </p>
                </div>

                {validationError && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Owner profile & API key activated successfully!</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  {isOwnerConfigured ? (
                    <button
                      type="button"
                      onClick={handleResetOwner}
                      className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Config</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-all"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-black font-semibold text-xs transition-all active:scale-95 shadow-lg cursor-pointer"
                      style={{ backgroundColor: currentTheme.primary }}
                    >
                      Save & Activate
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
