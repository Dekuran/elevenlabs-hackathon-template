import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sessionStore";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "demo";

    const session = getSession(sessionId);

    const status = {
      sessionId,
      hasCurrentCase: !!session.currentCase,
      awaitingUserInfo: session.currentCase?.awaitingUserInfo || false,
      pendingField: session.currentCase?.pendingField || null,
      pendingReason: session.currentCase?.pendingReason || null,
      readyToResume: session.currentCase?.readyToResume || false,
      user: session.user,
    };

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error("Error getting session status:", error);
    return NextResponse.json(
      { error: "Failed to get session status" },
      { status: 500 }
    );
  }
}
