import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      success: false,
      message: "Login por e-mail e senha foi desativado. Use login por token (e-mail/WhatsApp).",
    },
    { status: 410 }
  );
}
