/**
 * AudioStreamer
 * Captures microphone input, resamples to 16kHz PCM 16-bit little-endian,
 * analyzes real-time frequency data, and streams base64 chunks.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isMuted: boolean = false;
  private isRunning: boolean = false;
  private onAudioChunkCallback: ((base64Pcm: string) => void) | null = null;

  async start(onAudioChunk: (base64Pcm: string) => void): Promise<void> {
    if (this.isRunning) return;
    this.onAudioChunkCallback = onAudioChunk;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      const inputSampleRate = this.audioContext.sampleRate;
      const targetSampleRate = 16000;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // 4096 buffer size gives ~90ms chunks at 44.1k/48k
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRunning || this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Resample inputChannelData to 16kHz
        const resampled = this.resampleTo16k(inputChannelData, inputSampleRate, targetSampleRate);

        // Convert Float32 to 16-bit signed PCM
        const pcm16 = new Int16Array(resampled.length);
        for (let i = 0; i < resampled.length; i++) {
          const s = Math.max(-1, Math.min(1, resampled[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert PCM16 buffer to base64
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        if (this.onAudioChunkCallback) {
          this.onAudioChunkCallback(base64);
        }
      };

      this.sourceNode.connect(this.analyserNode);
      this.sourceNode.connect(this.processorNode);
      // Connect processor to destination so onaudioprocess fires (output is silent)
      this.processorNode.connect(this.audioContext.destination);

      this.isRunning = true;
    } catch (err) {
      this.stop();
      throw err;
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  getVisualizerData(): { volume: number; frequencies: number[] } {
    if (!this.analyserNode || !this.isRunning || this.isMuted) {
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

    const volume = Math.min(1, (sum / bufferLength) * 2.2);
    return { volume, frequencies };
  }

  stop(): void {
    this.isRunning = false;
    this.onAudioChunkCallback = null;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  private resampleTo16k(
    inputData: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (inputSampleRate === targetSampleRate) {
      return inputData;
    }

    const ratio = inputSampleRate / targetSampleRate;
    const targetLength = Math.round(inputData.length / ratio);
    const result = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      const srcIndex = i * ratio;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(inputData.length - 1, Math.ceil(srcIndex));
      const fraction = srcIndex - indexFloor;

      // Linear interpolation between sample points
      result[i] = inputData[indexFloor] * (1 - fraction) + inputData[indexCeil] * fraction;
    }

    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}
