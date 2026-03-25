import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Sessao nao encontrada.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected me error";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    );
  }
}