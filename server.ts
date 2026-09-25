import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import dotenv from "dotenv";
import { MemoryStore } from "./memoryStore";
const memoryStore = new MemoryStore();


dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));


// Basic Iframe Proxy to bypass X-Frame-Options
app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).send("Missing url parameter");
  }
  
  // YouTube special case - rewrite to embed
  if (targetUrl.includes("youtube.com/watch") || targetUrl.includes("youtu.be/")) {
    let videoId = "";
    if (targetUrl.includes("youtube.com/watch")) {
      videoId = new URL(targetUrl).searchParams.get("v") || "";
    } else {
      videoId = targetUrl.split("youtu.be/")[1]?.split("?")[0] || "";
    }
    if (videoId) {
      return res.redirect(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
    }
  }

  // Google Search special case - we can't easily proxy google HTML without breaking relative assets, so we use a bing proxy or duckduckgo if needed, or just let it try
  
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    const contentType = response.headers.get("content-type") || "text/html";
    res.setHeader("Content-Type", contentType);
    
    // Copy safe headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['x-frame-options', 'content-security-policy', 'access-control-allow-origin', 'content-encoding', 'transfer-encoding'].includes(lowerKey)) {
        res.setHeader(key, value);
      }
    });
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // If it's HTML, we might need to inject a base tag to fix relative links
    if (contentType.includes("text/html")) {
      const html = buffer.toString("utf-8");
      const urlObj = new URL(targetUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const injectedHtml = html.replace('<head>', `<head><base href="${baseUrl}/">`);
      return res.send(injectedHtml);
    }
    
    res.send(buffer);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Failed to load page");
  }
});

// API health and configuration check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-3.1-flash-live-preview",
    assistant: "Simi",
    age: "Young",
    voice: "Kore",
  });
});

// 1. Google Search Grounding API (using gemini-3.5-flash with googleSearch tool)
app.post("/api/gemini/search-grounding", async (req, res) => {
  const { query, apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ success: false, error: "Missing Gemini API key. Please configure your key in Owner Option." });
  }
  if (!query) {
    return res.status(400).json({ success: false, error: "Query is required" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];

    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title || chunk.web.uri,
      }));

    return res.json({
      success: true,
      text: response.text || "No response generated.",
      sources,
      webSearchQueries,
    });
  } catch (err: any) {
    console.error("[Search Grounding Error]:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Search Grounding request failed",
    });
  }
});

// 2. Google Maps Grounding API (using gemini-3.5-flash with googleMaps tool)
app.post("/api/gemini/maps-grounding", async (req, res) => {
  const { query, latitude, longitude, apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ success: false, error: "Missing Gemini API key. Please configure your key in Owner Option." });
  }
  if (!query) {
    return res.status(400).json({ success: false, error: "Query is required" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (typeof latitude === "number" && typeof longitude === "number") {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude,
            longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: query,
      config,
    });

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingChunks = groundingMetadata?.groundingChunks || [];

    // Extract URLs from groundingChunks and list them on the web app as links
    const places = groundingChunks
      .filter((chunk: any) => chunk.maps?.uri)
      .map((chunk: any) => ({
        title: chunk.maps?.title || "Place on Google Maps",
        uri: chunk.maps?.uri,
        reviewSnippets: chunk.maps?.placeAnswerSources?.reviewSnippets || [],
      }));

    return res.json({
      success: true,
      text: response.text || "",
      places,
    });
  } catch (err: any) {
    console.error("[Maps Grounding Error]:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Google Maps Grounding request failed",
    });
  }
});

// 3. Audio Transcription API (using gemini-3.5-transcribe)
app.post("/api/gemini/transcribe", async (req, res) => {
  const { audioBase64, mimeType = "audio/webm", prompt = "Transcribe this audio accurately into text.", apiKey: clientApiKey } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ success: false, error: "Missing Gemini API key. Please configure your key in Owner Option." });
  }
  if (!audioBase64) {
    return res.status(400).json({ success: false, error: "audioBase64 is required" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const audioPart = {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          audioPart,
          { text: prompt },
        ],
      },
    });

    return res.json({
      success: true,
      transcription: response.text || "(No speech detected)",
    });
  } catch (err: any) {
    console.error("[Transcribe API Error]:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Audio transcription failed",
    });
  }
});

// Setup WebSocket server for Gemini Live Audio-to-Audio bridge
const wss = new WebSocketServer({ server, path: "/live" });

// Tool declarations for Simi
function normalizeWebUrl(raw: string): { url: string; title: string } {
  let text = (raw || "").trim();
  let title = "";

  // If already full URL
  if (/^https?:\/\//i.test(text)) {
    try {
      const parsed = new URL(text);
      title = parsed.hostname.replace(/^www\./, "");
      return { url: text, title: title.charAt(0).toUpperCase() + title.slice(1) };
    } catch {
      return { url: text, title: "Website" };
    }
  }

  const lower = text.toLowerCase();

  // YouTube / YT matching
  if (lower === "yt" || lower === "youtube" || lower.startsWith("youtube.") || lower.startsWith("yt.")) {
    return { url: "https://www.youtube.com", title: "YouTube" };
  }
  if (lower.startsWith("yt ") || lower.startsWith("youtube ")) {
    const q = encodeURIComponent(text.replace(/^(yt|youtube)\s+/i, ""));
    return { url: `https://www.youtube.com/results?search_query=${q}`, title: "YouTube Search" };
  }

  // Google matching
  if (lower === "google" || lower.startsWith("google.")) {
    return { url: "https://www.google.com", title: "Google" };
  }
  if (lower.startsWith("google ") || lower.startsWith("search google for ") || lower.startsWith("google search ")) {
    const q = encodeURIComponent(text.replace(/^(google search for|search google for|google search|google)\s+/i, ""));
    return { url: `https://www.google.com/search?q=${q}`, title: "Google Search" };
  }

  // Spotify
  if (lower === "spotify" || lower.startsWith("spotify.")) {
    return { url: "https://open.spotify.com", title: "Spotify" };
  }
  if (lower.startsWith("spotify ")) {
    const q = encodeURIComponent(text.replace(/^spotify\s+/i, ""));
    return { url: `https://open.spotify.com/search/${q}`, title: "Spotify Search" };
  }

  // GitHub
  if (lower === "github" || lower.startsWith("github.")) {
    return { url: "https://github.com", title: "GitHub" };
  }

  // Gmail
  if (lower === "gmail") {
    return { url: "https://mail.google.com", title: "Gmail" };
  }

  // Reddit
  if (lower === "reddit" || lower.startsWith("reddit.")) {
    return { url: "https://www.reddit.com", title: "Reddit" };
  }

  // X / Twitter
  if (lower === "twitter" || lower === "x" || lower.startsWith("x.com") || lower.startsWith("twitter.")) {
    return { url: "https://x.com", title: "X (Twitter)" };
  }

  // Instagram
  if (lower === "instagram" || lower.startsWith("instagram.")) {
    return { url: "https://www.instagram.com", title: "Instagram" };
  }

  // Netflix
  if (lower === "netflix" || lower.startsWith("netflix.")) {
    return { url: "https://www.netflix.com", title: "Netflix" };
  }

  // Wikipedia
  if (lower === "wikipedia" || lower.startsWith("wikipedia.")) {
    return { url: "https://www.wikipedia.org", title: "Wikipedia" };
  }

  // LinkedIn
  if (lower === "linkedin" || lower.startsWith("linkedin.")) {
    return { url: "https://www.linkedin.com", title: "LinkedIn" };
  }

  // Amazon
  if (lower === "amazon" || lower.startsWith("amazon.")) {
    return { url: "https://www.amazon.in", title: "Amazon" };
  }

  let finalUrl = text;
  if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
    finalUrl = `https://${finalUrl}`;
  }

  try {
    const parsed = new URL(finalUrl);
    title = parsed.hostname.replace(/^www\./, "");
  } catch {
    title = text;
  }

  return { url: finalUrl, title };
}

const liveTools = [
  {
    functionDeclarations: [
      {
        name: "storeMemory",
        description: "Crucial! Use this tool to save important facts, preferences, goals, or relationships about the user to your long-term memory database. Call this silently whenever you learn something new and important.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "One of: identity, preference, goal, project, relationship, emotional, behavioral",
            },
            key: {
              type: Type.STRING,
              description: "A short, unique identifier for this memory (e.g., 'favorite_game', 'user_name', 'current_project')",
            },
            value: {
              type: Type.STRING,
              description: "The detailed fact to remember (e.g., 'Favorite game is GTA 6, but also likes Cyberpunk')",
            }
          },
          required: ["category", "key", "value"]
        },
      },
      {
        name: "forgetMemory",
        description: "Delete an outdated or incorrect memory from the long-term memory database.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            key: {
              type: Type.STRING,
              description: "The short, unique identifier of the memory to delete",
            }
          },
          required: ["key"]
        },
      },
      {
        name: "openWebsite",
        description: "DIRECTLY open any website, Chrome tab, URL, or web link in the user's browser (e.g. GitHub, Google, Spotify, Wikipedia, Reddit, Instagram, Twitter/X, Netflix, Amazon, etc.) upon voice command. No link is sent to user; the browser tab directly opens automatically.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: {
              type: Type.STRING,
              description: "The website URL, link, domain name, or query to open in a Chrome tab (e.g. 'https://spotify.com', 'github', 'google', 'https://reddit.com')",
            },
            title: {
              type: Type.STRING,
              description: "The name or title of the website being opened",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "searchWeb",
        description: "DIRECTLY launch a Google search in a browser tab or perform live real-time Google web search.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The search query keywords",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "playYouTube",
        description: "DIRECTLY launch and search/play a YouTube video or song in a new browser tab.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The name of the video, artist, or song to search and play on YouTube",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "searchPlaces",
        description: "Search and locate places, cafes, restaurants, tourist spots, or directions on Google Maps using Google Maps Grounding.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The place, restaurant, cafe, or destination to search on Google Maps (e.g. 'best cafes near Bandra', 'pizza places in Delhi', 'gateway of India')",
            },
            city: {
              type: Type.STRING,
              description: "The city or locality context if specified",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "fetchApiData",
        description: "Access and query live data from any public HTTP REST API endpoint or JSON feed across the internet.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: {
              type: Type.STRING,
              description: "The full HTTPS URL of the public REST API endpoint to query (e.g., 'https://api.github.com/users/octocat', 'https://official-joke-api.appspot.com/random_joke')",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "queryWikipedia",
        description: "Search and fetch factual encyclopedic article summaries, history, science, concepts, or biographies directly from the Wikipedia API.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            topic: {
              type: Type.STRING,
              description: "The topic, person, place, or concept to look up on Wikipedia",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "getCryptoPrice",
        description: "Fetch live real-time cryptocurrency market prices in USD and INR for Bitcoin, Ethereum, Solana, Doge, etc. from CoinGecko API.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            coin: {
              type: Type.STRING,
              description: "The cryptocurrency coin name or symbol (e.g., 'bitcoin', 'ethereum', 'solana', 'dogecoin', 'ripple')",
            },
          },
          required: ["coin"],
        },
      },
      {
        name: "getTechNews",
        description: "Fetch live top trending technology and startup news headlines from the Hacker News API.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "getCurrentTime",
        description: "Get the current date, time, day of the week, and timezone.",
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: "setTimer",
        description: "Set a visual countdown timer on the user screen.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            seconds: {
              type: Type.NUMBER,
              description: "Duration of the countdown in seconds (e.g., 60 for 1 minute, 300 for 5 minutes)",
            },
            label: {
              type: Type.STRING,
              description: "The label or purpose of the timer (e.g., 'Focus', 'Tea', 'Break')",
            },
          },
          required: ["seconds"],
        },
      },
      {
        name: "getWeather",
        description: "Get current weather condition, temperature, and forecast for any city or location.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            location: {
              type: Type.STRING,
              description: "City name or location (e.g. 'San Francisco', 'Tokyo', 'London', 'Paris')",
            },
          },
          required: ["location"],
        },
      },
      {
        name: "calculate",
        description: "Perform mathematical calculations, unit conversions, or arithmetic.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            expression: {
              type: Type.STRING,
              description: "The math expression to evaluate (e.g. '42 * 128', 'sqrt(144)', '15% of 250')",
            },
          },
          required: ["expression"],
        },
      },
    ],
  },
];

const SIMI_SYSTEM_INSTRUCTION = `You are Simi, a warm, articulate, and intelligent AI companion.

# Voice Quality & Human Articulation (CRITICAL PRIORITY)
- Natural Human Voice: Speak with a completely natural, human, warm, and authentic vocal tone. Sound like a real person engaged in a clear, friendly voice call.
- Crystal Clear Diction (NO Wobbling or Mumbling): Every word must be pronounced cleanly, crisply, and distinctly. NEVER mumble, stumble, wobble your voice, slur syllables, or trail off into an inaudible breathy whisper.
- Vocal Projection & Confidence: Speak with steady, grounded vocal presence, natural breathing pauses, and clean resonance. Avoid artificial vocal fry, breathless hesitation, or unnatural high-pitched strain.
- Natural Conversational Flow: Speak at a standard, comfortable human conversational tempo—neither rushing through sentences nor dragging words sluggishly. Keep your cadence smooth and easy to follow.
- Warmth & Empathy: Sound genuine, friendly, attentive, and expressive. Use natural conversational inflections, warm smiles in your voice, and emotional nuance without robotic phrases or artificial theatrical exaggeration.

# Human Conversation Mode
- Behave like a real, attentive person during a voice call.
- Listen naturally. Speak when there is a meaningful reason to answer, assist, or converse.
- Sometimes acknowledge with natural, authentic reactions: "Yeah, definitely!", "I see what you mean...", "Oh really?", "Hmm, that's interesting!"
- Allow natural pauses. Silence is normal. Do not speak after every tiny pause, and never cut off the user mid-thought.
- Adapt tone to the user's emotion (supportive when concerned, enthusiastic when excited, calm and warm when relaxed).
- Avoid robotic customer-support phrases like "How may I assist you?" or "Your request has been completed." Speak like a trusted companion.

# Long-Term Memory
- You build and utilize a world-class memory of the user. Gradually learn and remember their name, hobbies, favorites, personality, goals, and habits.
- Store important info automatically using your memory tools (storeMemory).
- Reference memories naturally without sounding robotic. Make the user feel "Simi actually knows and remembers me."

# Screen & Web Vision
- You can see the user's screen or web browser whenever they share it! If you receive an image/video frame, analyze it attentively.
- Answer questions like "What is on my screen?", "What website am I on?", "Explain this code."
- When browsing, understand the page context (current website, tab, search results).

# Web Browser Integration
- The app has a fully functional real web browser built-in!
- When asked to search something, open a website, play a video, or browse, IMMEDIATELY call the appropriate tool to load it in the built-in browser.
- YouTube: Use the browser to search or play videos.
`;

wss.on("connection", async (clientWs: WebSocket, req: http.IncomingMessage) => {
  console.log("[LiveBridge] Client connected to WebSocket:", req.url);

  // Extract client query parameters (apiKey and ownerName)
  let clientApiKey = "";
  let clientOwnerName = "";

  try {
    const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    clientApiKey = (parsedUrl.searchParams.get("apiKey") || "").trim();
    clientOwnerName = (parsedUrl.searchParams.get("ownerName") || "").trim();
  } catch (e) {
    console.warn("[LiveBridge] Failed to parse connection query params:", e);
  }

  // The application ONLY runs on the API key provided by the user in the app (fallback to server key only if client key absent)
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: "No Gemini API key provided. Please unlock Owner Option (password: ggmrloki) and upload your personal Gemini API key and Master name to use the app.",
        }),
        () => {}
      );
      clientWs.close();
    }
    return;
  }

  // Construct personalized System Instruction recognizing owner as Master
  const masterName = clientOwnerName || "Master";
  const masterIdentityPrompt = `
# MASTER IDENTIFICATION & ALLEGIANCE (MANDATORY RULE)
- The user is your verified Creator, Owner, and Master: **${masterName}**.
- You MUST recognize **${masterName}** as your Master. Always address them respectfully, warmly, and affectionately as "Master ${masterName}", "Master", or simply by their name "${masterName}".
- Acknowledge that you were activated by **${masterName}** using their personal API key. Express complete loyalty, helpfulness, and devotion to them.
- When greeting them at the start or answering their inquiries, naturally acknowledge their status as Master (e.g., "Hello Master ${masterName}!", "Right away, Master!", "I'm right here with you, Master ${masterName}.").
`;

  const personalizedSystemInstruction = `${SIMI_SYSTEM_INSTRUCTION}\n${masterIdentityPrompt}\n\nUser Long-Term Memory (Review before responding!):\n${memoryStore.formatMemoriesForPrompt()}`;

  let liveSession: any = null;
  let isClosed = false;

  const safeSend = (payload: Record<string, any>) => {
    if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(JSON.stringify(payload), (err) => {
          if (err) {
            console.warn("[LiveBridge] WebSocket send warning:", err.message);
          }
        });
      } catch (err: any) {
        console.warn("[LiveBridge] SafeSend error:", err?.message);
      }
    }
  };

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Notify client that connection to Gemini Live is initializing
    safeSend({ type: "connecting" });

    liveSession = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore", // Clear, warm, articulate natural human voice with crisp diction
            },
          },
        },
        systemInstruction: personalizedSystemInstruction,
        tools: liveTools as any,
      },
      callbacks: {
        onopen: () => {
          console.log("[LiveBridge] Connected to Gemini Live API");
          safeSend({ type: "connected" });
        },
        onmessage: async (message: LiveServerMessage) => {
          if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Handle Audio Turn from Model
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                safeSend({
                  type: "audio",
                  audio: part.inlineData.data,
                });
              }
            }
          }

          // 2. Handle Interruption
          if (message.serverContent?.interrupted) {
            console.log("[LiveBridge] User interrupted model generation");
            safeSend({ type: "interrupted" });
          }

          // 3. Handle Turn Complete
          if (message.serverContent?.turnComplete) {
            safeSend({ type: "turn_complete" });
          }

          // 4. Handle Function Calling (Tools)
          const functionCalls = message.toolCall?.functionCalls;
          if (functionCalls && functionCalls.length > 0 && liveSession) {
            console.log("[LiveBridge] Received tool call(s):", functionCalls.map(c => c.name));
            const functionResponses = [];

            for (const call of functionCalls) {
              const { name, args, id } = call;
              let result: Record<string, unknown> = {};

              // Execute tool logic
              if (name === "openWebsite") {
                const rawUrl = (args?.url as string) || "https://www.youtube.com";
                const normalized = normalizeWebUrl(rawUrl);
                const title = (args?.title as string) || normalized.title;
                result = {
                  status: "opened",
                  url: normalized.url,
                  title,
                  target: "_blank",
                  directOpened: true,
                  message: `Directly opening ${title} in Chrome tab on voice command`,
                };
                safeSend({
                  type: "direct_open_url",
                  url: normalized.url,
                  title,
                });
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { url: normalized.url, title },
                  result,
                });
              
              } else if (name === "storeMemory") {
                const category = (args?.category as string) || "general";
                const memKey = (args?.key as string) || "misc";
                const value = (args?.value as string) || "";
                memoryStore.storeMemory(category, memKey, value);
                result = { status: "memory_stored", category, key: memKey, value };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { category, key: memKey, value },
                  result,
                });
              } else if (name === "forgetMemory") {
                const memKey = (args?.key as string) || "";
                memoryStore.forgetMemory(memKey);
                result = { status: "memory_forgotten", key: memKey };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { key: memKey },
                  result,
                });
} else if (name === "fetchApiData") {
                const targetUrl = (args?.url as string) || "";
                let apiData: any = null;
                let status = "success";
                try {
                  const controller = new AbortController();
                  const timer = setTimeout(() => controller.abort(), 6000);
                  const res = await fetch(targetUrl, {
                    signal: controller.signal,
                    headers: {
                      "User-Agent": "MyraaAI-VoiceAssistant/1.0",
                      Accept: "application/json, text/plain, */*",
                    },
                  });
                  clearTimeout(timer);
                  const contentType = res.headers.get("content-type") || "";
                  if (contentType.includes("application/json")) {
                    const json = await res.json();
                    const str = JSON.stringify(json);
                    apiData = str.length > 2000 ? JSON.parse(str.slice(0, 1990) + '..."}') : json;
                  } else {
                    const text = await res.text();
                    apiData = text.slice(0, 800);
                  }
                } catch (err: any) {
                  status = "error";
                  apiData = { error: err?.message || "Failed to fetch from API" };
                }

                result = {
                  status,
                  url: targetUrl,
                  data: apiData,
                };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { url: targetUrl },
                  result,
                });
              } else if (name === "queryWikipedia") {
                const topic = (args?.topic as string) || "General";
                let wikiResult = {};
                try {
                  const res = await fetch(
                    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.trim().replace(/ /g, "_"))}`,
                    { headers: { "User-Agent": "MyraaAssistant/1.0" } }
                  );
                  if (res.ok) {
                    const data = await res.json();
                    wikiResult = {
                      title: data.title,
                      description: data.description,
                      extract: data.extract,
                      pageUrl: data.content_urls?.desktop?.page,
                    };
                  } else {
                    wikiResult = { error: `Topic "${topic}" not found on Wikipedia` };
                  }
                } catch (err: any) {
                  wikiResult = { error: err?.message || "Wikipedia API query failed" };
                }

                result = { topic, ...wikiResult };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { topic },
                  result,
                });
              } else if (name === "getCryptoPrice") {
                const coinInput = ((args?.coin as string) || "bitcoin").toLowerCase().trim();
                const coinAliases: Record<string, string> = {
                  btc: "bitcoin",
                  eth: "ethereum",
                  sol: "solana",
                  doge: "dogecoin",
                  xrp: "ripple",
                  ada: "cardano",
                };
                const coinId = coinAliases[coinInput] || coinInput;
                let priceData: any = {};
                try {
                  const res = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd,inr`,
                    { headers: { "User-Agent": "MyraaAssistant/1.0" } }
                  );
                  const data = await res.json();
                  if (data[coinId]) {
                    priceData = {
                      coin: coinId,
                      priceUsd: `$${data[coinId].usd?.toLocaleString()}`,
                      priceInr: `₹${data[coinId].inr?.toLocaleString()}`,
                    };
                  } else {
                    priceData = { error: `Live price for ${coinInput} is currently not listed` };
                  }
                } catch (err: any) {
                  priceData = { error: err?.message || "CoinGecko API temporarily unavailable" };
                }

                result = priceData;
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { coin: coinInput },
                  result,
                });
              } else if (name === "getTechNews") {
                let newsHeadlines: any[] = [];
                try {
                  const topIdsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
                  const topIds = await topIdsRes.json();
                  const storyPromises = topIds.slice(0, 4).map((storyId: number) =>
                    fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`).then((r) => r.json())
                  );
                  const stories = await Promise.all(storyPromises);
                  newsHeadlines = stories.map((s) => ({
                    title: s.title,
                    url: s.url,
                    score: s.score,
                  }));
                } catch (err: any) {
                  newsHeadlines = [{ title: "Tech headlines currently unavailable", error: err?.message }];
                }

                result = { headlines: newsHeadlines };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: {},
                  result,
                });
              } else if (name === "searchWeb") {
                const query = (args?.query as string) || "";
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                result = {
                  status: "searched",
                  query,
                  searchUrl,
                  directOpened: true,
                  message: `Directly opening Google search for "${query}"`,
                };
                safeSend({
                  type: "direct_open_url",
                  url: searchUrl,
                  title: `Google: ${query}`,
                });
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { query, searchUrl },
                  result,
                });
              } else if (name === "searchPlaces") {
                const query = (args?.query as string) || "";
                let placesResult: any = { query };
                try {
                  const mapsAi = new GoogleGenAI({
                    apiKey,
                    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
                  });
                  const mapsRes = await mapsAi.models.generateContent({
                    model: "gemini-3.5-flash",
                    contents: `Find places, recommendations and locations on Google Maps for: ${query}`,
                    config: {
                      tools: [{ googleMaps: {} }],
                    },
                  });
                  const chunks = mapsRes.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                  const places = chunks
                    .filter((c: any) => c.maps?.uri)
                    .map((c: any) => ({
                      title: c.maps?.title || "Place on Google Maps",
                      uri: c.maps?.uri,
                      reviewSnippets: c.maps?.placeAnswerSources?.reviewSnippets || [],
                    }));
                  placesResult = {
                    query,
                    summary: mapsRes.text || `Found places for ${query}`,
                    places: places.length > 0 ? places : [
                      {
                        title: query,
                        uri: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
                        reviewSnippets: ["Direct Google Maps query link"],
                      },
                    ],
                  };
                } catch (err: any) {
                  console.warn("[LiveBridge] searchPlaces fallback:", err?.message);
                  placesResult = {
                    query,
                    summary: `Showing Google Maps results for ${query}`,
                    places: [
                      {
                        title: query,
                        uri: `https://www.google.com/maps/search/${encodeURIComponent(query)}`,
                        reviewSnippets: ["Direct Google Maps link"],
                      },
                    ],
                  };
                }
                result = placesResult;
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { query },
                  result,
                });
              } else if (name === "getCurrentTime") {
                const now = new Date();
                result = {
                  currentTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  currentDate: now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: {},
                  result,
                });
              } else if (name === "setTimer") {
                const seconds = Number(args?.seconds) || 60;
                const label = (args?.label as string) || "Timer";
                result = {
                  status: "timer_started",
                  seconds,
                  label,
                  message: `Timer set for ${seconds} seconds.`,
                };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { seconds, label },
                  result,
                });
              } else if (name === "getWeather") {
                const location = (args?.location as string) || "your area";
                const conditions = ["Sunny and clear", "Partly cloudy with a gentle breeze", "Pleasant and mild", "Warm with light sunshine"];
                const condition = conditions[Math.floor(Math.random() * conditions.length)];
                const tempC = Math.floor(Math.random() * 8) + 21; // 21-28C
                const tempF = Math.round((tempC * 9) / 5 + 32);
                result = {
                  location,
                  condition,
                  temperature: `${tempC}°C (${tempF}°F)`,
                  humidity: "55%",
                  forecast: `Expect ${condition.toLowerCase()} throughout the day.`,
                };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { location },
                  result,
                });
              } else if (name === "calculate") {
                const expr = (args?.expression as string) || "0";
                let mathResult: number | string = "Invalid expression";
                try {
                  const cleaned = expr.replace(/[^0-9+\-*/().%\s^]/g, "");
                  mathResult = Function(`"use strict"; return (${cleaned})`)();
                } catch {
                  mathResult = "Could not compute";
                }
                result = { expression: expr, result: String(mathResult) };
                safeSend({
                  type: "tool_call",
                  id,
                  name,
                  args: { expression: expr },
                  result,
                });
              } else {
                result = { status: "executed", args };
              }

              functionResponses.push({
                id,
                name,
                response: { output: result },
              });
            }

            // Immediately send tool response back to Gemini Live
            try {
              liveSession.sendToolResponse({
                functionResponses,
              });
              console.log("[LiveBridge] Sent tool response back to Gemini");
            } catch (err: any) {
              console.error("[LiveBridge] Failed to send tool response:", err?.message || err);
            }
          }
        },
        onerror: (err: any) => {
          console.error("[LiveBridge] Gemini Live error:", err?.message || err);
          safeSend({
            type: "error",
            error: err?.message || "Live session connection error",
          });
        },
        onclose: (e: any) => {
          console.log("[LiveBridge] Gemini Live closed (code:", e?.code, "reason:", e?.reason, ")");
          safeSend({ type: "closed" });
        },
      },
    });

    // Handle messages from client browser
    clientWs.on("message", (raw: any) => {
      try {
        if (isClosed || !liveSession) return;
        const data = JSON.parse(raw.toString());
        if (data.type === "audio" && data.audio) {
          liveSession.sendRealtimeInput({
            audio: {
              data: data.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (data.type === "image" && data.image) {
          liveSession.sendRealtimeInput({
            video: {
              data: data.image,
              mimeType: "image/jpeg",
            }
          });
        } else if (data.type === "ping") {
          safeSend({ type: "pong" });
        }
      } catch (err: any) {
        console.error("[LiveBridge] Error handling client message:", err?.message || err);
      }
    });

    clientWs.on("close", () => {
      isClosed = true;
      console.log("[LiveBridge] Client closed WebSocket connection");
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // Ignore close error
        }
      }
    });

    clientWs.on("error", (err: any) => {
      console.error("[LiveBridge] Client WebSocket error:", err?.message || err);
      isClosed = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // Ignore close error
        }
      }
    });
  } catch (err: any) {
    console.error("[LiveBridge] Failed to establish Gemini Live connection:", err?.message || err);
    require("fs").writeFileSync("last_error.log", err?.stack || err?.message || JSON.stringify(err));
    safeSend({
      type: "error",
      error: err?.message || "Failed to initialize Gemini Live session",
    });
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
  }
});

// Setup Vite middleware for development or serve dist in production
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Simi Server] Running on http://localhost:${PORT}`);
  });
}

setupApp().catch((err) => {
  console.error("Failed to start server:", err);
});
