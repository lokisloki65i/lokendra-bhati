import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ToolCallItem } from "../types";
import {
  Globe,
  Search,
  Clock,
  CloudSun,
  Calculator,
  Timer,
  ExternalLink,
  X,
  Database,
  BookOpen,
  Coins,
  Newspaper,
  CheckCircle2,
} from "lucide-react";

interface ToolActionCardProps {
  tools: ToolCallItem[];
  onDismiss: (id: string) => void;
}

export const ToolActionCard: React.FC<ToolActionCardProps> = ({
  tools,
  onDismiss,
}) => {
  if (tools.length === 0) return null;

  const getToolIcon = (name: string) => {
    switch (name) {
      case "openWebsite":
        return <Globe className="w-4 h-4 text-cyan-300" />;
      case "fetchApiData":
        return <Database className="w-4 h-4 text-emerald-300" />;
      case "queryWikipedia":
        return <BookOpen className="w-4 h-4 text-amber-300" />;
      case "getCryptoPrice":
        return <Coins className="w-4 h-4 text-yellow-300" />;
      case "getTechNews":
        return <Newspaper className="w-4 h-4 text-rose-300" />;
      case "searchWeb":
        return <Search className="w-4 h-4 text-indigo-300" />;
      case "getCurrentTime":
        return <Clock className="w-4 h-4 text-sky-300" />;
      case "getWeather":
        return <CloudSun className="w-4 h-4 text-teal-300" />;
      case "calculate":
        return <Calculator className="w-4 h-4 text-pink-300" />;
      case "setTimer":
        return <Timer className="w-4 h-4 text-purple-300" />;
      default:
        return <Globe className="w-4 h-4 text-cyan-300" />;
    }
  };

  const formatToolDetails = (item: ToolCallItem) => {
    const { name, args, result } = item;

    if (name === "openWebsite") {
      const url = args?.url || result?.url;
      const title = args?.title || result?.title || "Website";
      return {
        badge: "Chrome Tab Launched",
        title: `Opened ${title}`,
        detail: url,
        actionUrl: url,
        actionLabel: `Open ${title} ↗`,
      };
    }

    if (name === "fetchApiData") {
      const url = args?.url || result?.url || "";
      const isError = result?.status === "error";
      let summary = "";
      if (result?.data) {
        if (typeof result.data === "object") {
          summary = JSON.stringify(result.data).slice(0, 80) + "...";
        } else {
          summary = String(result.data).slice(0, 80);
        }
      }
      return {
        badge: isError ? "API Error" : "API Response 200 OK",
        title: "Fetched REST API Data",
        detail: summary || url,
        actionUrl: url,
        actionLabel: "View API Endpoint",
      };
    }

    if (name === "queryWikipedia") {
      const topic = args?.topic || result?.topic || "Topic";
      const extract = result?.extract ? `${result.extract.slice(0, 110)}...` : result?.description || "Wikipedia Article Summary";
      return {
        badge: "Wikipedia API",
        title: result?.title || topic,
        detail: extract,
        actionUrl: result?.pageUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
        actionLabel: "Read on Wikipedia",
      };
    }

    if (name === "getCryptoPrice") {
      const coin = (result?.coin || args?.coin || "Crypto").toUpperCase();
      const priceStr = result?.priceUsd && result?.priceInr
        ? `${result.priceUsd} • ${result.priceInr}`
        : result?.error || "Price retrieved";
      return {
        badge: "CoinGecko Market Data",
        title: `${coin} Live Price`,
        detail: priceStr,
        actionUrl: `https://www.coingecko.com/en/coins/${(args?.coin || "bitcoin").toLowerCase()}`,
        actionLabel: "Market Chart",
      };
    }

    if (name === "getTechNews") {
      const headlines = result?.headlines || [];
      const firstHeadline = headlines[0]?.title || "Top Hacker News stories fetched";
      return {
        badge: "Hacker News API",
        title: "Trending Tech News",
        detail: firstHeadline,
        actionUrl: headlines[0]?.url || "https://news.ycombinator.com",
        actionLabel: "Open Top Story",
      };
    }

    if (name === "searchWeb") {
      const query = args?.query || "";
      const searchUrl = result?.searchUrl || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      return {
        badge: "Google Search",
        title: "Search Launched",
        detail: `"${query}"`,
        actionUrl: searchUrl,
        actionLabel: "View Results ↗",
      };
    }

    if (name === "getCurrentTime") {
      return {
        badge: "System Clock",
        title: "Current Time & Date",
        detail: `${result?.currentTime || ""} • ${result?.currentDate || ""}`,
      };
    }

    if (name === "getWeather") {
      return {
        badge: "Live Forecast",
        title: `Weather: ${result?.location || args?.location || "Location"}`,
        detail: `${result?.temperature || ""} • ${result?.condition || ""}`,
      };
    }

    if (name === "calculate") {
      return {
        badge: "Math Engine",
        title: "Calculation",
        detail: `${args?.expression || ""} = ${result?.result || ""}`,
      };
    }

    if (name === "setTimer") {
      return {
        badge: "Timer Active",
        title: "Countdown Started",
        detail: `${args?.seconds || 60}s for "${args?.label || "Timer"}"`,
      };
    }

    return {
      badge: "Tool Call",
      title: name,
      detail: JSON.stringify(args),
    };
  };

  return (
    <div id="myraa-tool-notifications" className="fixed top-20 right-4 z-40 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {tools.slice(0, 3).map((item) => {
          const info = formatToolDetails(item);

          return (
            <motion.div
              key={item.id}
              id={`tool-card-${item.id}`}
              initial={{ opacity: 0, x: 25, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 25, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-auto p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-2xl flex items-start gap-3 backdrop-blur-xl ring-1 ring-white/10"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                {getToolIcon(item.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/20 truncate">
                      {info.badge}
                    </span>
                  </div>
                  <button
                    id={`dismiss-tool-${item.id}`}
                    onClick={() => onDismiss(item.id)}
                    className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="text-xs font-semibold text-slate-100 mt-1 truncate">
                  {info.title}
                </h4>

                <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                  {info.detail}
                </p>

                {info.actionUrl && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <a
                      id={`action-link-${item.id}`}
                      href={info.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-200 hover:text-cyan-100 bg-cyan-900/40 hover:bg-cyan-800/50 border border-cyan-500/40 px-2.5 py-1 rounded-lg transition-all shadow-sm active:scale-95"
                    >
                      <span>{info.actionLabel || "Open"}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
