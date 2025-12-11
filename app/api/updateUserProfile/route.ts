import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession, UserProfile } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  try {
    const { sessionId = "demo", patch } = await req.json();

    if (!patch || typeof patch !== "object") {
      return NextResponse.json(
        { error: "patch object is required" },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);

    session.user = {
      ...session.user,
      ...(patch as Partial<UserProfile>),
    };

    saveSession(sessionId, session);

    return NextResponse.json(session.user, { status: 200 });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
