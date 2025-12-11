import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  try {
    const { sessionId = "demo", transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json(
        { error: "transcript is required" },
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

    const callSummaryEn =
      "You called the pension office, explained your home country pension coverage, and they agreed to review your exemption request.";

    const nextStepsEn =
      "- Send copy of UK National Insurance certificate by email to pension.shibuya@example.jp\n- Wait for confirmation letter (4-6 weeks)\n- If no response, call again using reference number: REF-2024-1234";

    session.currentCase.callSummaryEn = callSummaryEn;
    session.currentCase.nextStepsEn = nextStepsEn;
    saveSession(sessionId, session);

    return NextResponse.json(
      { callSummaryEn, nextStepsEn },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error summarizing call:", error);
    return NextResponse.json(
      { error: "Failed to summarize call" },
      { status: 500 }
    );
  }
}
