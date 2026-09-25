import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Globe, ExternalLink, X, Sparkles, Loader2, BookOpen } from "lucide-react";
import { SearchGroundingResponse } from "../types";
import { useOwner } from "../services/OwnerContext";

interface SearchGroundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_QUERIES = [
  "Latest ISRO space mission updates",
  "Current cricket match live scores and news",
  "Top AI developments and models released this month",
  "Latest tech startup funding in India",
];

export const SearchGroundingModal: React.FC<SearchGroundingModalProps> = ({ isOpen, onClose }) => {
  const { ownerConfig } = useOwner();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchGroundingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/gemini/search-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, apiKey: ownerConfig.apiKey }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Search Grounding request failed");
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch search-grounded answers.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGoogle = () => {
    const q = query.trim();
    if (!q) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Google Search Grounding</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    gemini-3.5-flash
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time web grounding with live web search sources
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
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask any current question, news, or fact..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
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
              <span className="text-[11px] text-slate-500 font-medium mr-1">Trending:</span>
              {PRESET_QUERIES.map((preset) => (
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
                <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                <div className="pt-3 flex gap-2">
                  <div className="h-7 bg-slate-800 rounded-lg w-28"></div>
                  <div className="h-7 bg-slate-800 rounded-lg w-32"></div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {result && !loading && (
              <div className="space-y-4">
                {/* Synthesized Answer */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Grounded Answer
                    </span>
                    <button
                      onClick={handleOpenGoogle}
                      className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <span>Search on Google</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {result.text}
                  </div>
                </div>

                {/* Sources List */}
                {result.sources && result.sources.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      Grounding Sources ({result.sources.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/40 transition-all group flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate group-hover:text-cyan-300">
                              {src.title || src.uri}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {src.uri}
                            </p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>Powered by Gemini 3.5 Flash Google Search</span>
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
