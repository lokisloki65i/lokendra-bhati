import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { X, ChevronLeft, ChevronRight, RotateCw, Home, Search, Maximize2 } from "lucide-react";

interface WebBrowserProps {
  initialUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WebBrowser: React.FC<WebBrowserProps> = ({ initialUrl = "https://www.google.com", isOpen, onClose }) => {
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (initialUrl && initialUrl !== currentUrl) {
      navigate(initialUrl);
    }
  }, [initialUrl]);

  if (!isOpen) return null;

  const navigate = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      if (finalUrl.includes(".") && !finalUrl.includes(" ")) {
        finalUrl = "https://" + finalUrl;
      } else {
        finalUrl = "https://www.google.com/search?q=" + encodeURIComponent(finalUrl);
      }
    }
    setUrlInput(finalUrl);
    setCurrentUrl(finalUrl);
    setIsLoading(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(urlInput);
  };

  const getProxyUrl = (url: string) => {
    // If it's already an embed or safe iframe link, just use it
    if (url.includes("youtube.com/embed")) return url;
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute inset-x-4 md:inset-x-20 top-24 bottom-24 z-40 flex flex-col bg-zinc-900/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Browser Chrome (Header) */}
      <div className="h-12 bg-black/60 border-b border-white/10 flex items-center px-4 gap-3 select-none">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => navigate(currentUrl)} className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"><RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} /></button>
          <button onClick={() => navigate("https://www.google.com")} className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Home className="w-4 h-4" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 max-w-2xl mx-auto flex items-center bg-white/5 border border-white/10 rounded-full px-4 h-8 focus-within:bg-white/10 focus-within:border-white/30 transition-colors">
          <Search className="w-3.5 h-3.5 text-white/40 mr-2" />
          <input 
            type="text" 
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-white/30"
            placeholder="Search or enter web address"
          />
        </form>

        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Web View */}
      <div className="flex-1 bg-white relative">
        <iframe 
          ref={iframeRef}
          src={getProxyUrl(currentUrl)}
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </motion.div>
  );
};
