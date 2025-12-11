import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession, CaseState } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  try {
    const { sessionId = "demo", documentId, isResume = false } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);

    const doc = session.documents.find((d) => d.id === documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const user = session.user;
    let callContext, memoryBlob;

    if (isResume && session.currentCase) {
      callContext = session.currentCase.callContext;

      const fieldValue =
        session.currentCase.pendingField === "residence_card_number"
          ? session.user.residenceCardNumber
          : session.user.pensionNumber;

      memoryBlob =
        session.currentCase.memoryBlob +
        ` UPDATE: User provided ${session.currentCase.pendingField}: ${fieldValue}`;
    } else {
      callContext = {
        call_goal_en: "Request exemption due to home country pension coverage",
        call_goal_ja:
          "本国の年金制度に加入しているため、この期間の日本の年金保険料を免除できるか確認する。",
        facts_to_state_ja: [
          "利用者はイギリスの年金制度(National Insurance)に加入している。",
          "日英の社会保障協定の対象となる勤務形態である。",
          "対象期間は2023年4月から9月である。",
        ],
        questions_to_ask_ja: [
          "この期間の日本の年金保険料が免除される可能性はあるか。",
          "必要な書類と提出方法を教えてほしい。",
        ],
      };

      memoryBlob = `User ${user.name ?? "Unknown"} from ${user.country ?? "Unknown"} paying pension in ${user.homePensionSystem ?? "home system"} received notice from ${doc.extracted.issuer ?? "pension office"} for ${doc.extracted.amountYen ?? "unknown"} yen.`;
    }

    const caseState: CaseState = {
      id: session.currentCase?.id || `case_${documentId}`,
      userId: user.id,
      documentId,
      callContext,
      memoryBlob,
      readyToResume: false,
    };

    session.currentCase = caseState;
    saveSession(sessionId, session);

    return NextResponse.json(
      { callContext, memoryBlob, isResume },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error preparing call:", error);
    return NextResponse.json(
      { error: "Failed to prepare call" },
      { status: 500 }
    );
  }
}
