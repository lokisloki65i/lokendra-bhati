import { AudioStreamer } from "./AudioStreamer";
import { AudioPlayer } from "./AudioPlayer";
import { ToolManager } from "./ToolManager";
import { StateManager } from "./StateManager";

export class LiveSession {
  private ws: WebSocket | null = null;
  private streamer: AudioStreamer;
  private player: AudioPlayer;
  private toolManager: ToolManager;
  private stateManager: StateManager;
  private pingInterval: any = null;
  private lastPingTime: number = 0;
  private isConnecting: boolean = false;

  constructor(stateManager: StateManager, toolManager: ToolManager) {
    this.stateManager = stateManager;
    this.toolManager = toolManager;

    this.player = new AudioPlayer((isPlaying) => {
      // When audio player stops playing and we are not disconnected, return to listening
      if (!isPlaying) {
        const current = this.stateManager.getState().assistantState;
        if (current === "speaking") {
          this.stateManager.setAssistantState("listening");
        }
      }
    });

    this.streamer = new AudioStreamer();

    // Link toolManager callbacks to stateManager
    this.toolManager.setCallbacks({
      onToolEvent: (item) => {
        this.stateManager.addToolCall(item);
      },
      onTimerAdded: (timer) => {
        this.stateManager.addTimer(timer);
      },
      onDirectOpen: (event) => {
        this.stateManager.setDirectOpenEvent(event);
      },
    });
  }

  async connect(apiKey?: string, ownerName?: string): Promise<void> {
    if (this.isConnecting || this.stateManager.getState().assistantState !== "disconnected") {
      return;
    }

    this.isConnecting = true;
    this.stateManager.setErrorMessage(null);
    this.stateManager.setAssistantState("connecting");

    try {
      // Determine WebSocket protocol (wss: for https, ws: for http)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const params = new URLSearchParams();
      if (apiKey) params.set("apiKey", apiKey.trim());
      if (ownerName) params.set("ownerName", ownerName.trim());
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const wsUrl = `${protocol}//${host}/live${queryString}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log("[LiveSession] WebSocket connection open, starting microphone streamer");
        this.startPingLoop();

        try {
          await this.streamer.start((base64Pcm) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: "audio", audio: base64Pcm }));
            }
          });

          this.isConnecting = false;
          this.stateManager.setAssistantState("listening");
        } catch (micErr: any) {
          console.error("[LiveSession] Microphone access denied or error:", micErr);
          this.stateManager.setErrorMessage(
            micErr?.name === "NotAllowedError"
              ? "Microphone access was denied. Please allow microphone access in your browser."
              : "Could not access microphone: " + (micErr?.message || "Unknown error")
          );
          this.disconnect();
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "connected":
              console.log("[LiveSession] Gemini Live ready");
              break;

            case "audio":
              if (msg.audio) {
                // Transition to speaking state and schedule audio chunk
                this.stateManager.setAssistantState("speaking");
                await this.player.playChunk(msg.audio);
              }
              break;

            case "interrupted":
              console.log("[LiveSession] Received interruption signal");
              // User started speaking while Myraa was speaking: cut off audio immediately
              this.player.interrupt();
              this.stateManager.setAssistantState("listening");
              break;

            case "turn_complete":
              // Server finished sending chunks for this turn
              if (!this.player.isPlaying()) {
                this.stateManager.setAssistantState("listening");
              }
              break;

            case "direct_open_url":
              console.log("[LiveSession] Direct open URL received:", msg);
              this.toolManager.directOpenUrl(msg.url, msg.title);
              break;

            case "tool_call":
              console.log("[LiveSession] Tool call received:", msg);
              // If it's openWebsite or searchWeb, make sure direct open runs immediately
              if (msg.name === "openWebsite" && msg.args?.url) {
                this.toolManager.directOpenUrl(msg.args.url, msg.args.title);
              } else if (msg.name === "searchWeb" && msg.result?.searchUrl) {
                this.toolManager.directOpenUrl(msg.result.searchUrl, `Google Search: ${msg.args?.query || ""}`);
              }
              await this.toolManager.executeToolCall(msg.id, msg.name, msg.args, msg.result);
              break;

            case "pong":
              if (this.lastPingTime > 0) {
                const latency = Date.now() - this.lastPingTime;
                this.stateManager.setLatency(latency);
              }
              break;

            case "error":
              console.error("[LiveSession] Server reported error:", msg.error);
              this.stateManager.setErrorMessage(msg.error);
              this.disconnect();
              break;

            case "closed":
              console.log("[LiveSession] Server closed session");
              this.disconnect();
              break;
          }
        } catch (err) {
          console.error("[LiveSession] Error processing server message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.error("[LiveSession] WebSocket error:", err);
        this.stateManager.setErrorMessage("Connection to Simi voice service failed. Please check network connection.");
        this.disconnect();
      };

      this.ws.onclose = () => {
        console.log("[LiveSession] WebSocket closed");
        this.disconnect();
      };
    } catch (err: any) {
      console.error("[LiveSession] Connection initialization failed:", err);
      this.stateManager.setErrorMessage(err?.message || "Failed to start live session");
      this.disconnect();
    }
  }

  disconnect(): void {
    this.isConnecting = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.streamer.stop();
    this.player.interrupt();
    this.stateManager.setAssistantState("disconnected");
  }

  toggleMute(): void {
    const nextMuted = !this.stateManager.getState().isMuted;
    this.streamer.setMuted(nextMuted);
    this.stateManager.setMuted(nextMuted);
  }

  getVisualizerData(): {
    volume: number;
    frequencies: number[];
    source: "input" | "output" | "idle";
  } {
    const state = this.stateManager.getState().assistantState;

    if (state === "speaking") {
      const data = this.player.getVisualizerData();
      return { ...data, source: "output" };
    }

    if (state === "listening") {
      const data = this.streamer.getVisualizerData();
      return { ...data, source: "input" };
    }

    return {
      volume: 0,
      frequencies: new Array(32).fill(0),
      source: "idle",
    };
  }

  getDetailedVisualizerData(): {
    inputVolume: number;
    outputVolume: number;
    frequencies: number[];
    source: "input" | "output" | "idle";
  } {
    const inputData = this.streamer.getVisualizerData();
    const outputData = this.player.getVisualizerData();
    const state = this.stateManager.getState().assistantState;

    return {
      inputVolume: inputData.volume,
      outputVolume: outputData.volume,
      frequencies: state === "speaking" ? outputData.frequencies : inputData.frequencies,
      source: state === "speaking" ? "output" : state === "listening" ? "input" : "idle",
    };
  }

  private startPingLoop(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 4000);
  }

  sendImageFrame(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "image", image: base64Jpeg }));
    }
  }

  destroy(): void {
    this.disconnect();
    this.player.close();
  }
}
