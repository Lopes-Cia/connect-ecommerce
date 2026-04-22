import { NextResponse } from "next/server"

import { ensureAuthWebserviceToken } from "@/lib/integration/authWebserviceClient"
import { HttpError } from "@/lib/integration/network"

export const dynamic = "force-dynamic"

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  try {
    const token = await ensureAuthWebserviceToken({ backgroundRefresh: false })
    return NextResponse.json({ success: true, data: token })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.data ?? { success: false, message: "Erro no tokenService" }, {
        status: error.status,
      })
    }

    const message = error instanceof Error ? error.message : "Unexpected tokenService error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

