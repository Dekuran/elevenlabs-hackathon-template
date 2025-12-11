import { NextRequest, NextResponse } from "next/server";

type ExtractField = "residence_card_number" | "pension_number" | "all";

export async function POST(req: NextRequest) {
  try {
    const {
      imageBase64,
      sessionId = "demo",
      extractField = "all",
    } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    let extracted: Record<string, any> = {};

    if (extractField === "residence_card_number" || extractField === "all") {
      extracted = {
        residence_card_number: "A1234567890",
        name: "John Smith",
        expiration_date: "2028-06-15",
      };
    } else if (extractField === "pension_number") {
      extracted = {
        pension_number: "1234-567890-1",
        name: "John Smith",
        issuing_authority: "Japan Pension Service",
      };
    }

    return NextResponse.json(
      {
        success: true,
        extracted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error analyzing ID document:", error);
    return NextResponse.json(
      { error: "Failed to analyze ID document" },
      { status: 500 }
    );
  }
}
