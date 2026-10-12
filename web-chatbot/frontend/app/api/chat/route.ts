import { NextRequest, NextResponse } from "next/server";
import { getBotReply } from "@/lib/botResponses";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? "";

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Mesaj boş olamaz." },
        { status: 400 }
      );
    }

    const reply = getBotReply(message);

    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: "Sunucu tarafında bir hata oluştu." },
      { status: 500 }
    );
  }
}
