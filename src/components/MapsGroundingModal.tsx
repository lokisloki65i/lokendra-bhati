import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Navigation, ExternalLink, X, Sparkles, Loader2, Star, MessageSquare } from "lucide-react";
import { MapsGroundingResponse } from "../types";
import { useOwner } from "../services/OwnerContext";

interface MapsGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MAP_QUERIES = [
  "Top cozy cafes in Bandra, Mumbai",
  "Historic heritage monuments in Delhi",
  "Best South Indian breakfast places in Indiranagar, Bengaluru",
  "Scenic sunset viewpoints near Marine Drive",
];

export const MapsGroundingModal: React.FC<MapsGroundingModalProps> = ({ isOpen, onClose }) => {
  const { ownerConfig } = useOwner();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<MapsGroundingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !coords) {
      handleDetectLocation();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        console.warn("[Geolocation]:", err.message);
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/gemini/maps-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          latitude: coords?.lat,
          longitude: coords?.lng,
          apiKey: ownerConfig.apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Google Maps Grounding request failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch Maps-grounded data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectMapsSearch = () => {
    const q = query.trim();
    if (!q) return;
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-[1px] shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Google Maps Grounding</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    gemini-3.5-flash
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Location intelligence and direct Google Maps destination links
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
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Search Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cafes, restaurants, monuments, or spots..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                title={coords ? "GPS Location detected" : "Detect current GPS location"}
                className={`px-3 py-2.5 rounded-xl border flex items-center gap-1 text-xs transition-colors ${
                  coords
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{coords ? "GPS On" : "Locate"}</span>
              </button>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Search</span>
              </button>
            </form>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-slate-500 font-medium mr-1">Try:</span>
              {PRESET_MAP_QUERIES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setQuery(preset);
                    handleSearch(preset);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => handleSearch()}
                  className="underline font-semibold ml-2 hover:text-rose-200"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded w-full"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="h-20 bg-slate-800 rounded-xl"></div>
                  <div className="h-20 bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {result && !loading && (
              <div className="space-y-4">
                {/* Description */}
                {result.text && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Grounded Overview
                      </span>
                      <button
                        onClick={handleDirectMapsSearch}
                        className="text-xs text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      >
                        <span>Open on Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {result.text}
                    </div>
                  </div>
                )}

                {/* Grounding Places list (extracted from groundingChunks.maps.uri) */}
                {result.places && result.places.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Extracted Places & Directions ({result.places.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {result.places.map((place, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="text-sm font-semibold text-white flex items-center gap-1.5">
                                {place.title}
                              </h5>
                              <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                                {place.uri}
                              </p>
                            </div>
                            <a
                              href={place.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                            >
                              <span>View Map</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          {/* Review Snippets (from groundingChunks.maps.placeAnswerSources.reviewSnippets) */}
                          {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800/60 space-y-1">
                              {place.reviewSnippets.slice(0, 2).map((snip, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300 italic">
                                  <MessageSquare className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>"{snip}"</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center">
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      <span>Explore all "{query}" listings on Google Maps ↗</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>Powered by Gemini 3.5 Flash Google Maps Grounding</span>
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
