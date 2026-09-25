import { AssistantState, ToolCallItem, ActiveTimer, DirectOpenEvent } from "../types";

export interface AppState {
  assistantState: AssistantState;
  isMuted: boolean;
  errorMessage: string | null;
  activeTimers: ActiveTimer[];
  recentTools: ToolCallItem[];
  directOpenEvent: DirectOpenEvent | null;
  sessionDuration: number;
  inputVolume: number;
  outputVolume: number;
  latencyMs: number;
}

type StateListener = (state: AppState) => void;

export class StateManager {
  private state: AppState = {
    assistantState: "disconnected",
    isMuted: false,
    errorMessage: null,
    activeTimers: [],
    recentTools: [],
    directOpenEvent: null,
    sessionDuration: 0,
    inputVolume: 0,
    outputVolume: 0,
    latencyMs: 0,
  };

  private listeners: Set<StateListener> = new Set();
  private timerInterval: any = null;
  private durationInterval: any = null;

  constructor() {
    this.startTimerLoop();
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setAssistantState(assistantState: AssistantState): void {
    if (this.state.assistantState !== assistantState) {
      this.state = { ...this.state, assistantState };
      this.notify();

      if (assistantState === "listening" || assistantState === "speaking") {
        this.startSessionTimer();
      } else if (assistantState === "disconnected") {
        this.stopSessionTimer();
      }
    }
  }

  setMuted(isMuted: boolean): void {
    this.state = { ...this.state, isMuted };
    this.notify();
  }

  setErrorMessage(errorMessage: string | null): void {
    this.state = { ...this.state, errorMessage };
    this.notify();
  }

  setLatency(latencyMs: number): void {
    this.state = { ...this.state, latencyMs };
    this.notify();
  }

  setAudioVolumes(inputVolume: number, outputVolume: number): void {
    this.state = { ...this.state, inputVolume, outputVolume };
    this.notify();
  }

  addToolCall(item: ToolCallItem): void {
    // Keep last 5 recent tools
    const updated = [item, ...this.state.recentTools.filter((t) => t.id !== item.id)].slice(0, 5);
    this.state = { ...this.state, recentTools: updated };
    this.notify();
  }

  dismissToolCall(id: string): void {
    this.state = {
      ...this.state,
      recentTools: this.state.recentTools.filter((t) => t.id !== id),
    };
    this.notify();
  }

  setDirectOpenEvent(event: DirectOpenEvent | null): void {
    this.state = {
      ...this.state,
      directOpenEvent: event,
    };
    this.notify();
  }

  dismissDirectOpenEvent(): void {
    if (this.state.directOpenEvent) {
      this.state = {
        ...this.state,
        directOpenEvent: null,
      };
      this.notify();
    }
  }

  addTimer(timer: ActiveTimer): void {
    this.state = {
      ...this.state,
      activeTimers: [...this.state.activeTimers, timer],
    };
    this.notify();
  }

  removeTimer(id: string): void {
    this.state = {
      ...this.state,
      activeTimers: this.state.activeTimers.filter((t) => t.id !== id),
    };
    this.notify();
  }

  togglePauseTimer(id: string): void {
    this.state = {
      ...this.state,
      activeTimers: this.state.activeTimers.map((t) =>
        t.id === id ? { ...t, isPaused: !t.isPaused } : t
      ),
    };
    this.notify();
  }

  private startTimerLoop(): void {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      let hasChanges = false;
      const updatedTimers = this.state.activeTimers.map((timer) => {
        if (!timer.isPaused && timer.remainingSeconds > 0) {
          hasChanges = true;
          const nextRemaining = timer.remainingSeconds - 1;
          if (nextRemaining === 0) {
            this.playTimerChime();
          }
          return { ...timer, remainingSeconds: nextRemaining };
        }
        return timer;
      });

      if (hasChanges) {
        this.state = { ...this.state, activeTimers: updatedTimers };
        this.notify();
      }
    }, 1000);
  }

  private startSessionTimer(): void {
    if (this.durationInterval) return;
    this.durationInterval = setInterval(() => {
      this.state = {
        ...this.state,
        sessionDuration: this.state.sessionDuration + 1,
      };
      this.notify();
    }, 1000);
  }

  private stopSessionTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    this.state = { ...this.state, sessionDuration: 0 };
    this.notify();
  }

  private playTimerChime(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio context might be restricted
    }
  }

  destroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.durationInterval) clearInterval(this.durationInterval);
    this.listeners.clear();
  }
}
