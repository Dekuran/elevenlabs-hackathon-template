import { getPusherClient, getConversationChannel } from "./pusher";
import type { Channel } from "pusher-js";

export type TranscriptMessage = {
  speaker: "agent" | "operator";
  text_ja: string;
  text_en: string | null;
  is_final: boolean;
  timestamp: number;
};

export type AudioMessage = {
  data: string;
  timestamp: number;
};

export type StatusMessage = {
  status: "connected" | "active" | "ended";
  metadata?: any;
  timestamp: number;
};

export class CallStreamClient {
  private pusher: any;
  private channel: Channel;
  private conversationId: string;
  private onTranscript?: (msg: TranscriptMessage) => void;
  private onAudio?: (msg: AudioMessage) => void;
  private onStatus?: (msg: StatusMessage) => void;
  private onError?: (error: any) => void;

  constructor(
    conversationId: string,
    sessionId: string,
    callbacks: {
      onTranscript?: (msg: TranscriptMessage) => void;
      onAudio?: (msg: AudioMessage) => void;
      onStatus?: (msg: StatusMessage) => void;
      onError?: (error: any) => void;
    }
  ) {
    this.conversationId = conversationId;
    this.onTranscript = callbacks.onTranscript;
    this.onAudio = callbacks.onAudio;
    this.onStatus = callbacks.onStatus;
    this.onError = callbacks.onError;

    this.pusher = getPusherClient();
    const channelName = getConversationChannel(conversationId);
    this.channel = this.pusher.subscribe(channelName);

    this.channel.bind("transcript", (data: TranscriptMessage) => {
      this.onTranscript?.(data);
    });

    this.channel.bind("audio", (data: AudioMessage) => {
      this.onAudio?.(data);
    });

    this.channel.bind("status", (data: StatusMessage) => {
      this.onStatus?.(data);
    });

    this.channel.bind("error", (data: any) => {
      console.error("Stream error:", data);
      this.onError?.(data);
    });

    this.startBackendStream(conversationId, sessionId);
  }

  private async startBackendStream(conversationId: string, sessionId: string) {
    try {
      const response = await fetch("/api/startStream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, sessionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start stream");
      }

      console.log("Backend stream started");
    } catch (error) {
      console.error("Error starting backend stream:", error);
      this.onError?.(error);
    }
  }

  async disconnect() {
    await fetch("/api/stopStream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: this.conversationId }),
    });

    this.pusher.unsubscribe(getConversationChannel(this.conversationId));
    this.pusher.disconnect();
  }
}
