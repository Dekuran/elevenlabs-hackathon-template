import { NextRequest, NextResponse } from "next/server";
import { pusherServer, getConversationChannel } from "@/lib/pusher";
import { activeStreams } from "@/lib/streamConnections";

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }

    const ws = activeStreams.get(conversationId);
    if (ws) {
      ws.close();
      activeStreams.delete(conversationId);

      const channelName = getConversationChannel(conversationId);
      await pusherServer.trigger(channelName, "status", {
        status: "ended",
        timestamp: Date.now(),
      });

      return NextResponse.json(
        { message: "Stream stopped" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "No active stream found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error stopping stream:", error);
    return NextResponse.json(
      { error: "Failed to stop stream" },
      { status: 500 }
    );
  }
}
