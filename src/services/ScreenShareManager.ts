import { LiveSession } from "./LiveSession";

export class ScreenShareManager {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private captureInterval: any = null;
  private liveSession: LiveSession | null = null;

  public isSharing: boolean = false;
  private onStateChange: (isSharing: boolean) => void;

  constructor(onStateChange: (isSharing: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  setLiveSession(session: LiveSession | null) {
    this.liveSession = session;
  }

  async startSharing() {
    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: false
      });

      this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopSharing();
      });

      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      
      this.canvasElement = document.createElement('canvas');

      this.isSharing = true;
      this.onStateChange(true);

      // Start capturing frames
      this.captureInterval = setInterval(() => this.captureFrame(), 3000); // every 3 seconds

    } catch (err) {
      console.error("[ScreenShare] Failed to start:", err);
      this.isSharing = false;
      this.onStateChange(false);
    }
  }

  stopSharing() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.videoElement = null;
    this.canvasElement = null;
    this.isSharing = false;
    this.onStateChange(false);
  }

  private captureFrame() {
    if (!this.isSharing || !this.videoElement || !this.canvasElement || !this.liveSession) return;
    if (this.videoElement.videoWidth === 0) return;

    // Set canvas dimensions (compress to 720p or similar to save bandwidth)
    const MAX_WIDTH = 1280;
    let width = this.videoElement.videoWidth;
    let height = this.videoElement.videoHeight;
    
    if (width > MAX_WIDTH) {
      height = height * (MAX_WIDTH / width);
      width = MAX_WIDTH;
    }

    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, width, height);

    // Convert to base64 JPEG
    const dataUrl = this.canvasElement.toDataURL('image/jpeg', 0.6);
    const base64Data = dataUrl.split(',')[1];

    if (base64Data) {
      this.liveSession.sendImageFrame(base64Data);
    }
  }
}
