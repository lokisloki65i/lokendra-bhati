export type AssistantState = "disconnected" | "connecting" | "listening" | "speaking";

export interface ToolCallItem {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  timestamp: number;
  status: "executing" | "completed" | "failed";
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isPaused: boolean;
  createdAt: number;
}

export interface AudioVisualizerData {
  inputVolume: number;
  outputVolume: number;
  frequencies: number[];
}

export interface LiveSessionStats {
  sessionDuration: number;
  packetsSent: number;
  packetsReceived: number;
  lastLatencyMs: number;
}

export interface DirectOpenEvent {
  url: string;
  title: string;
  timestamp: number;
  success: boolean;
}

export interface SearchGroundingSource {
  uri: string;
  title: string;
}

export interface SearchGroundingResponse {
  success: boolean;
  text: string;
  sources: SearchGroundingSource[];
  webSearchQueries: string[];
  error?: string;
}

export interface MapsGroundingPlace {
  title: string;
  uri: string;
  reviewSnippets?: string[];
  placeAnswerSources?: any;
}

export interface MapsGroundingResponse {
  success: boolean;
  text: string;
  places: MapsGroundingPlace[];
  error?: string;
}

export interface TranscribeResponse {
  success: boolean;
  transcription: string;
  error?: string;
}
