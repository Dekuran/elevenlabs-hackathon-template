import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/sessionStore";

type InfoField = "residence_card_number" | "pension_number";

export async function POST(req: NextRequest) {
  try {
    const { sessionId = "demo", field, reason } = await req.json();

    if (!field) {
      return NextResponse.json(
        { error: "field is required" },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);

    if (!session.currentCase) {
      return NextResponse.json(
        { error: "No active case" },
        { status: 400 }
      );
    }

    session.currentCase.pendingField = field;
    session.currentCase.pendingReason = reason;
    session.currentCase.awaitingUserInfo = true;

    saveSession(sessionId, session);

    return NextResponse.json(
      {
        status: "pending",
        field,
        reason,
        message: "Pausing call - need to gather user info",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error requesting user info:", error);
    return NextResponse.json(
      { error: "Failed to request user info" },
      { status: 500 }
    );
  }
}
