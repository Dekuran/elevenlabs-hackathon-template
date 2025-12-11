import { NextRequest, NextResponse } from "next/server";
import { getSession, saveSession, CaseDocument } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, sessionId = "demo" } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);

    const geminiResult = {
      doc_type: "pension_non_payment" as const,
      issuer: "Shibuya Pension Office",
      amount_yen: 240000,
      due_date: "2025-01-31",
      period: "2023-04-01 to 2023-09-30",
      contact_phone: "03-XXXX-YYYY",
      is_payment_required: true,
      summary_en:
        "Unpaid pension contributions notice for April-September 2023, 240,000 yen due by Jan 31, 2025.",
    };

    const doc: CaseDocument = {
      id: `doc_${session.documents.length + 1}`,
      type: geminiResult.doc_type,
      originalImageUrl: undefined,
      extracted: {
        issuer: geminiResult.issuer,
        amountYen: geminiResult.amount_yen,
        dueDate: geminiResult.due_date,
        period: geminiResult.period,
        contactPhone: geminiResult.contact_phone,
        isPaymentRequired: geminiResult.is_payment_required,
        summaryEn: geminiResult.summary_en,
        rawJson: geminiResult,
      },
    };

    session.documents.push(doc);
    saveSession(sessionId, session);

    return NextResponse.json(doc, { status: 200 });
  } catch (error) {
    console.error("Error analyzing letter:", error);
    return NextResponse.json(
      { error: "Failed to analyze letter" },
      { status: 500 }
    );
  }
}
