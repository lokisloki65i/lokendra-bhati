import { ToolCallItem, ActiveTimer, DirectOpenEvent } from "../types";

export type ToolExecutionHandler = (args: Record<string, any>) => Promise<any> | any;

export class ToolManager {
  private toolHandlers: Map<string, ToolExecutionHandler> = new Map();
  private onToolEventCallback: ((item: ToolCallItem) => void) | null = null;
  private onTimerAddedCallback: ((timer: ActiveTimer) => void) | null = null;
  private onDirectOpenCallback: ((event: DirectOpenEvent) => void) | null = null;

  constructor() {
    this.registerBuiltInTools();
  }

  setCallbacks(callbacks: {
    onToolEvent?: (item: ToolCallItem) => void;
    onTimerAdded?: (timer: ActiveTimer) => void;
    onDirectOpen?: (event: DirectOpenEvent) => void;
  }) {
    if (callbacks.onToolEvent) this.onToolEventCallback = callbacks.onToolEvent;
    if (callbacks.onTimerAdded) this.onTimerAddedCallback = callbacks.onTimerAdded;
    if (callbacks.onDirectOpen) this.onDirectOpenCallback = callbacks.onDirectOpen;
  }

  registerTool(name: string, handler: ToolExecutionHandler): void {
    this.toolHandlers.set(name, handler);
  }

  /**
   * Directly opens a URL (YouTube, Google, Spotify, etc.) via the built-in in-app browser overlay.
   */
  directOpenUrl(rawUrl: string, rawTitle?: string): boolean {
    let url = (rawUrl || "https://www.youtube.com").trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    let title = rawTitle || "Website";
    if (!rawTitle) {
      try {
        const parsed = new URL(url);
        title = parsed.hostname.replace(/^www\./, "");
        title = title.charAt(0).toUpperCase() + title.slice(1);
      } catch {
        title = url;
      }
    }

    const event: DirectOpenEvent = {
      url,
      title,
      timestamp: Date.now(),
      success: true,
    };

    if (this.onDirectOpenCallback) {
      this.onDirectOpenCallback(event);
    }

    return true;
  }

  private registerBuiltInTools(): void {
    // 1. openWebsite
    this.registerTool("openWebsite", (args) => {
      const rawUrl = (args?.url as string) || "https://www.youtube.com";
      const title = args?.title || "Website";
      const opened = this.directOpenUrl(rawUrl, title);

      return {
        url: rawUrl,
        title,
        opened,
        directOpened: true,
        message: `Directly launched ${title} in Chrome tab on voice command`,
      };
    });

    // 2. searchWeb
    this.registerTool("searchWeb", (args) => {
      const query = (args?.query as string) || "";
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      const opened = this.directOpenUrl(searchUrl, `Google Search: ${query}`);

      return {
        query,
        searchUrl,
        opened,
        directOpened: true,
      };
    });

    // 2b. playYouTube
    this.registerTool("playYouTube", (args) => {
      const query = (args?.query as string) || "";
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const opened = this.directOpenUrl(searchUrl, `YouTube: ${query}`);

      return {
        query,
        searchUrl,
        opened,
        directOpened: true,
      };
    });

    // 3. setTimer
    this.registerTool("setTimer", (args) => {
      const seconds = Math.max(1, Number(args?.seconds) || 60);
      const label = (args?.label as string) || "Timer";

      const newTimer: ActiveTimer = {
        id: `timer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isPaused: false,
        createdAt: Date.now(),
      };

      if (this.onTimerAddedCallback) {
        this.onTimerAddedCallback(newTimer);
      }

      return {
        timerId: newTimer.id,
        label,
        duration: seconds,
        status: "active",
      };
    });

    // 4. getCurrentTime
    this.registerTool("getCurrentTime", () => {
      const now = new Date();
      return {
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        date: now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    });

    // 5. getWeather
    this.registerTool("getWeather", (args) => {
      const location = args?.location || "Current Location";
      return {
        location,
        summary: `Retrieved weather forecast for ${location}`,
      };
    });

    // 6. calculate
    this.registerTool("calculate", (args) => {
      return {
        expression: args?.expression,
      };
    });

    // 7. fetchApiData
    this.registerTool("fetchApiData", (args) => {
      return {
        url: args?.url,
      };
    });

    // 8. queryWikipedia
    this.registerTool("queryWikipedia", (args) => {
      return {
        topic: args?.topic,
      };
    });

    // 9. getCryptoPrice
    this.registerTool("getCryptoPrice", (args) => {
      return {
        coin: args?.coin,
      };
    });

    // 10. getTechNews
    this.registerTool("getTechNews", () => {
      return {
        source: "Hacker News",
      };
    });
  }

  async executeToolCall(id: string, name: string, args: Record<string, any>, serverResult?: any): Promise<void> {
    const item: ToolCallItem = {
      id,
      name,
      args,
      result: serverResult,
      timestamp: Date.now(),
      status: "executing",
    };

    if (this.onToolEventCallback) {
      this.onToolEventCallback(item);
    }

    try {
      const handler = this.toolHandlers.get(name);
      let localResult = null;
      if (handler) {
        localResult = await handler(args);
      }

      item.result = { ...(serverResult || {}), ...(localResult || {}) };
      item.status = "completed";

      if (this.onToolEventCallback) {
        this.onToolEventCallback(item);
      }
    } catch (err: any) {
      item.status = "failed";
      item.result = { error: err?.message || "Execution error" };
      if (this.onToolEventCallback) {
        this.onToolEventCallback(item);
      }
    }
  }
}
