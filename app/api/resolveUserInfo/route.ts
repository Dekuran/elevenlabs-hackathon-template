import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  try {
    const { sessionId = "demo", field, value } = await req.json();

    if (!field || !value) {
      return NextResponse.json(
        { error: "field and value are required" },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);

    if (field === "residence_card_number") {
      session.user.residenceCardNumber = value;
    } else if (field === "pension_number") {
      session.user.pensionNumber = value;
    } else {
      return NextResponse.json(
        { error: "Invalid field type" },
        { status: 400 }
      );
    }

    if (session.currentCase) {
      // Capture the last resolved field/value so we can correctly
      // append this information to the memoryBlob on call resume.
      session.currentCase.lastResolvedField = field;
      session.currentCase.lastResolvedValue = value;

      session.currentCase.pendingField = undefined;
      session.currentCase.pendingReason = undefined;
      session.currentCase.awaitingUserInfo = false;
      session.currentCase.readyToResume = true;
    }

    saveSession(sessionId, session);

    return NextResponse.json(
      {
        resolved: true,
        field,
        value,
        readyToResume: true,
        user: session.user,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resolving user info:", error);
    return NextResponse.json(
      { error: "Failed to resolve user info" },
      { status: 500 }
    );
  }
}
