import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";
import { v2 as translateV2 } from "@google-cloud/translate";
import { pusherServer, getConversationChannel } from "@/lib/pusher";
import { activeStreams } from "@/lib/streamConnections";

function getTranslateClient() {
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentials?.startsWith('{')) {
    return new translateV2.Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: JSON.parse(credentials),
    });
  } else if (credentials) {
    return new translateV2.Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: credentials,
    });
  } else {
    return new translateV2.Translate({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }
}

const translate = getTranslateClient();

async function translateWithGoogle(text: string): Promise<string> {
  try {
    const [translation] = await translate.translate(text, {
      from: "ja",
      to: "en",
      format: "text",
    });
    return translation;
  } catch (error) {
    console.error("Translation error:", error);
    return "[Translation unavailable]";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { conversationId, sessionId } = await req.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }

    if (activeStreams.has(conversationId)) {
      return NextResponse.json(
        { message: "Stream already active" },
        { status: 200 }
      );
    }

    const channelName = getConversationChannel(conversationId);

    const elevenLabsWsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${process.env.ELEVENLABS_AGENT_ID_JAPANESE}`;
    const elevenLabsWs = new WebSocket(elevenLabsWsUrl, {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
    });

    activeStreams.set(conversationId, elevenLabsWs);

    elevenLabsWs.on("open", async () => {
      console.log("Connected to ElevenLabs WebSocket");
      await pusherServer.trigger(channelName, "status", {
        status: "connected",
        timestamp: Date.now(),
      });
    });

    elevenLabsWs.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "audio":
            await pusherServer.trigger(channelName, "audio", {
              data: message.audio_event?.audio_base_64 || message.audio_base_64,
              timestamp: Date.now(),
            });
            break;

          case "transcript":
            const transcriptEvent = message.transcript_event || message;
            const speaker = transcriptEvent.role === "agent" ? "agent" : "operator";
            const textJa = transcriptEvent.transcript || transcriptEvent.text;
            const isFinal = transcriptEvent.is_final !== false;

            if (isFinal && textJa?.trim()) {
              const textEn = await translateWithGoogle(textJa);

              await pusherServer.trigger(channelName, "transcript", {
                speaker,
                text_ja: textJa,
                text_en: textEn,
                is_final: true,
                timestamp: Date.now(),
              });
            } else if (!isFinal && textJa?.trim()) {
              await pusherServer.trigger(channelName, "transcript", {
                speaker,
                text_ja: textJa,
                text_en: null,
                is_final: false,
                timestamp: Date.now(),
              });
            }
            break;

          case "interruption":
            await pusherServer.trigger(channelName, "interruption", {
              timestamp: Date.now(),
            });
            break;

          case "ping":
            elevenLabsWs.send(JSON.stringify({ type: "pong" }));
            break;

          case "conversation_initiation_metadata":
            await pusherServer.trigger(channelName, "status", {
              status: "active",
              metadata: message,
              timestamp: Date.now(),
            });
            break;

          case "agent_response":
            await pusherServer.trigger(channelName, "agent_speaking", {
              timestamp: Date.now(),
            });
            break;

          case "user_transcript":
            const userText = message.user_transcript;
            if (userText?.trim()) {
              const translation = await translateWithGoogle(userText);
              await pusherServer.trigger(channelName, "transcript", {
                speaker: "operator",
                text_ja: userText,
                text_en: translation,
                is_final: true,
                timestamp: Date.now(),
              });
            }
            break;
        }
      } catch (error) {
        console.error("Error processing message:", error);
        await pusherServer.trigger(channelName, "error", {
          message: "Stream processing error",
        });
      }
    });

    elevenLabsWs.on("error", async (error) => {
      console.error("ElevenLabs WebSocket error:", error);
      await pusherServer.trigger(channelName, "error", {
        message: "Connection error",
      });
    });

    elevenLabsWs.on("close", async () => {
      console.log("ElevenLabs WebSocket closed");
      activeStreams.delete(conversationId);
      await pusherServer.trigger(channelName, "status", {
        status: "ended",
        timestamp: Date.now(),
      });
    });

    return NextResponse.json(
      {
        success: true,
        channelName,
        message: "Stream started",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error starting stream:", error);
    return NextResponse.json(
      { error: "Failed to start stream" },
      { status: 500 }
    );
  }
}
