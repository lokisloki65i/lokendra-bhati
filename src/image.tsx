import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Upload, X, Check, Video, Image as ImageIcon, Trash2, RotateCcw, Sparkles, ShieldCheck } from "lucide-react";

export type AnimeExpression = "attentive" | "cheerful" | "winking" | "resting";

export interface StoredHologramItem {
  url: string;
  mimeType: string;
  name: string;
}

export type HologramMap = Record<AnimeExpression, StoredHologramItem | null>;

interface HologramContextType {
  holograms: HologramMap;
  hasAnyHologram: boolean;
  getHologramForExpression: (expr: AnimeExpression) => StoredHologramItem | null;
  saveHologram: (key: AnimeExpression | "all", file: File) => Promise<void>;
  resetHologram: (key: AnimeExpression) => Promise<void>;
  resetAllHolograms: () => Promise<void>;
  isUploaderOpen: boolean;
  setIsUploaderOpen: (open: boolean) => void;
  isLoaded: boolean;
  // Backward compatibility alias
  videos: Record<AnimeExpression, string | null>;
}

const HologramContext = createContext<HologramContextType | undefined>(undefined);

export const useVideoContext = () => {
  const context = useContext(HologramContext);
  if (!context) throw new Error("useVideoContext must be used within ImageProvider");
  return context;
};

// ---------------- IndexedDB Persistent Storage ----------------
const DB_NAME = "MyraaHologramsDB";
const DB_VERSION = 1;
const STORE_NAME = "custom_holograms";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<{ file: Blob; mimeType: string; name: string } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? { file: req.result.file, mimeType: req.result.mimeType, name: req.result.name } : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[HologramDB] Error reading key:", key, err);
    return null;
  }
}

async function idbPut(key: string, file: Blob, mimeType: string, name: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ key, file, mimeType, name, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------- Provider Component ----------------
export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [holograms, setHolograms] = useState<HologramMap>({
    resting: null,
    attentive: null,
    cheerful: null,
    winking: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  // Keep track of active ObjectURLs to revoke when replaced
  const objectUrlsRef = useRef<Record<string, string>>({});

  // Load saved holograms from IndexedDB on initial mount
  useEffect(() => {
    let mounted = true;
    const loadFromStorage = async () => {
      const keys: AnimeExpression[] = ["resting", "attentive", "cheerful", "winking"];
      const loaded: HologramMap = { resting: null, attentive: null, cheerful: null, winking: null };

      for (const key of keys) {
        const item = await idbGet(key);
        if (item && item.file) {
          const url = URL.createObjectURL(item.file);
          objectUrlsRef.current[key] = url;
          loaded[key] = {
            url,
            mimeType: item.mimeType || item.file.type || "video/mp4",
            name: item.name || `${key}_hologram`,
          };
        }
      }

      if (mounted) {
        setHolograms(loaded);
        setIsLoaded(true);
      }
    };

    loadFromStorage();

    return () => {
      mounted = false;
      // Revoke all created URLs on unmount
      (Object.values(objectUrlsRef.current) as string[]).forEach((url) => {
        try {
          if (url) URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
    };
  }, []);

  const saveHologram = async (targetKey: AnimeExpression | "all", file: File) => {
    const mimeType = file.type || (file.name.endsWith(".mp4") ? "video/mp4" : "image/jpeg");
    const keysToUpdate: AnimeExpression[] =
      targetKey === "all" ? ["resting", "attentive", "cheerful", "winking"] : [targetKey];

    const nextHolograms = { ...holograms };

    for (const k of keysToUpdate) {
      // Revoke previous URL if any
      if (objectUrlsRef.current[k]) {
        try {
          URL.revokeObjectURL(objectUrlsRef.current[k]);
        } catch {
          // ignore
        }
      }

      // Save to IndexedDB persistently
      await idbPut(k, file, mimeType, file.name);

      // Create new blob URL
      const newUrl = URL.createObjectURL(file);
      objectUrlsRef.current[k] = newUrl;
      nextHolograms[k] = {
        url: newUrl,
        mimeType,
        name: file.name,
      };
    }

    setHolograms(nextHolograms);
  };

  const resetHologram = async (key: AnimeExpression) => {
    if (objectUrlsRef.current[key]) {
      try {
        URL.revokeObjectURL(objectUrlsRef.current[key]);
      } catch {
        // ignore
      }
      delete objectUrlsRef.current[key];
    }

    await idbDelete(key);

    setHolograms((prev) => ({
      ...prev,
      [key]: null,
    }));
  };

  const resetAllHolograms = async () => {
    (Object.values(objectUrlsRef.current) as string[]).forEach((url) => {
      try {
        if (url) URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    objectUrlsRef.current = {};

    await idbClear();

    setHolograms({
      resting: null,
      attentive: null,
      cheerful: null,
      winking: null,
    });
  };

  // Check if user has uploaded at least 1 hologram
  const hasAnyHologram = Boolean(
    holograms.resting || holograms.attentive || holograms.cheerful || holograms.winking
  );

  // Smart fallback: returns the specific state, or falls back to any state user uploaded
  const getHologramForExpression = (expr: AnimeExpression): StoredHologramItem | null => {
    if (holograms[expr]) return holograms[expr];
    return holograms.resting || holograms.cheerful || holograms.attentive || holograms.winking || null;
  };

  // Compatibility helper: map of expression -> URL string or null
  const videos: Record<AnimeExpression, string | null> = {
    resting: holograms.resting?.url || null,
    attentive: holograms.attentive?.url || null,
    cheerful: holograms.cheerful?.url || null,
    winking: holograms.winking?.url || null,
  };

  return (
    <HologramContext.Provider
      value={{
        holograms,
        hasAnyHologram,
        getHologramForExpression,
        saveHologram,
        resetHologram,
        resetAllHolograms,
        isUploaderOpen,
        setIsUploaderOpen,
        isLoaded,
        videos,
      }}
    >
      {children}
    </HologramContext.Provider>
  );
};

// ---------------- Modal UI Component ----------------
export const ImageVideoUploader: React.FC = () => {
  const {
    holograms,
    saveHologram,
    resetHologram,
    resetAllHolograms,
    hasAnyHologram,
    isUploaderOpen,
    setIsUploaderOpen,
  } = useVideoContext();

  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"individual" | "universal">("individual");
  const universalInputRef = useRef<HTMLInputElement>(null);

  if (!isUploaderOpen) return null;

  const handleUploadSingle = async (key: AnimeExpression, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await saveHologram(key, file);
      // Reset input value to allow re-uploading same file if desired
      e.target.value = "";
    }
  };

  const handleUploadUniversal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await saveHologram("all", file);
      e.target.value = "";
    }
  };

  const states: { key: AnimeExpression; label: string; desc: string }[] = [
    { key: "resting", label: "Resting (Standby)", desc: "When standby or disconnected" },
    { key: "attentive", label: "Attentive (Listening)", desc: "When listening to your voice" },
    { key: "cheerful", label: "Cheerful (Speaking)", desc: "When talking and answering" },
    { key: "winking", label: "Winking (Expressive)", desc: "High energy or emphasis" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-7 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col justify-between">
        {/* Close Button */}
        <button
          onClick={() => {
            setIsUploaderOpen(false);
            setConfirmResetAll(false);
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white">Hologram Option</h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Saved securely on this device (Never resets automatically)</span>
              </div>
            </div>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Upload your personal video or image hologram. Only you control your hologram; it will stay on your device across sessions until you reset it below.
          </p>

          {/* Quick Universal Upload Banner */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-white">Quick Setup (All 4 States)</p>
              <p className="text-[11px] text-zinc-400">
                Upload 1 video or photo to apply to all conversation expressions simultaneously.
              </p>
            </div>
            <label className="cursor-pointer shrink-0 px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload for All</span>
              <input
                ref={universalInputRef}
                type="file"
                accept="video/*,image/*"
                onChange={handleUploadUniversal}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 4 State Expression Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
          {states.map((state) => {
            const currentItem = holograms[state.key];
            const isVideo = currentItem?.mimeType.startsWith("video");

            return (
              <div
                key={state.key}
                className={`relative rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 overflow-hidden border transition-all ${
                  currentItem
                    ? "bg-zinc-900/80 border-white/30 shadow-lg"
                    : "bg-black/50 border-white/10 hover:border-white/20"
                }`}
              >
                {/* Media Preview or Empty Placeholder */}
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/60 flex items-center justify-center border border-white/5">
                  {currentItem ? (
                    <>
                      {isVideo ? (
                        <video
                          src={currentItem.url}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={currentItem.url}
                          alt={state.label}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-zinc-500 text-center px-2">
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-zinc-400" />
                      </div>
                      <span className="text-[11px]">No hologram set</span>
                    </div>
                  )}
                </div>

                {/* State Info */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white">{state.label}</p>
                    {currentItem && (
                      <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[100px]">
                        {currentItem.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{state.desc}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <label className="flex-1 cursor-pointer py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5">
                    <Upload className="w-3 h-3" />
                    <span>{currentItem ? "Replace" : "Upload"}</span>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      onChange={(e) => handleUploadSingle(state.key, e)}
                      className="hidden"
                    />
                  </label>

                  {currentItem && (
                    <button
                      onClick={() => resetHologram(state.key)}
                      className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                      title={`Reset ${state.label} hologram`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Reset All Option */}
          {hasAnyHologram ? (
            confirmResetAll ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400 font-medium">Remove all device holograms?</span>
                <button
                  onClick={async () => {
                    await resetAllHolograms();
                    setConfirmResetAll(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setConfirmResetAll(false)}
                  className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmResetAll(true)}
                className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1.5 transition-colors py-1 px-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Holograms</span>
              </button>
            )
          ) : (
            <span className="text-[11px] text-zinc-500">
              No custom holograms loaded on this device yet.
            </span>
          )}

          {/* Done Button */}
          <button
            onClick={() => {
              setIsUploaderOpen(false);
              setConfirmResetAll(false);
            }}
            className="w-full sm:w-auto px-7 py-2 bg-white text-black font-semibold text-xs sm:text-sm rounded-full hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
