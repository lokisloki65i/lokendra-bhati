/**
 * AudioPlayer
 * Plays back 24kHz raw PCM 16-bit audio received from Gemini Live,
 * schedules chunks gaplessly, provides real-time frequency analysis,
 * and handles instantaneous interruption clearing.
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onPlaybackStateChange: ((isPlaying: boolean) => void) | null = null;
  private isMuted: boolean = false;
  private checkDrainInterval: any = null;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    if (onPlaybackStateChange) {
      this.onPlaybackStateChange = onPlaybackStateChange;
    }
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === "closed") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      try {
        this.audioContext = new AudioContextClass({ sampleRate: 24000 });
      } catch {
        this.audioContext = new AudioContextClass();
      }
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  async playChunk(base64Pcm: string): Promise<void> {
    try {
      const ctx = await this.ensureAudioContext();

      // Decode base64 to binary ArrayBuffer
      const binaryString = window.atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Live API returns 16-bit little-endian PCM at 24000 Hz
      const sampleCount = Math.floor(bytes.byteLength / 2);
      const int16Array = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);
      const float32Array = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const val = int16Array[i];
        float32Array[i] = val < 0 ? val / 32768 : val / 32767;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);

      // Gapless scheduling
      const currentTime = ctx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.005; // Tight 5ms lookahead to eliminate stutter gaps
      }

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      this.activeSources.add(source);
      if (this.onPlaybackStateChange && this.activeSources.size === 1) {
        this.onPlaybackStateChange(true);
      }

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0 && this.onPlaybackStateChange) {
          // Give tiny grace period before declaring playback stopped
          setTimeout(() => {
            if (this.activeSources.size === 0) {
              this.onPlaybackStateChange?.(false);
            }
          }, 60);
        }
      };
    } catch (err) {
      console.error("[AudioPlayer] Error playing audio chunk:", err);
    }
  }

  /**
   * Immediately stops all audio output and clears queued buffers.
   * Called when the user speaks over Myraa (interruption).
   */
  interrupt(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already stopped sources
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;

    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(false);
    }
  }

  setVolume(volume: number): void {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(
        this.isMuted ? 0 : Math.max(0, Math.min(1, volume)),
        this.audioContext.currentTime
      );
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.setVolume(muted ? 0 : 1);
  }

  getVisualizerData(): { volume: number; frequencies: number[] } {
    if (!this.analyserNode || this.activeSources.size === 0 || this.isMuted) {
      return { volume: 0, frequencies: new Array(32).fill(0) };
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    const frequencies: number[] = [];
    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i] / 255;
      frequencies.push(val);
      sum += val;
    }

    const volume = Math.min(1, (sum / bufferLength) * 2.5);
    return { volume, frequencies };
  }

  isPlaying(): boolean {
    return this.activeSources.size > 0;
  }

  close(): void {
    this.interrupt();
    if (this.checkDrainInterval) {
      clearInterval(this.checkDrainInterval);
      this.checkDrainInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
