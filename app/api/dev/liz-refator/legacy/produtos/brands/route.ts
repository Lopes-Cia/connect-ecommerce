import { NextResponse } from "next/server"

import { integrationGetJson } from "@/liz_refator/integration/client"
import { HttpError } from "@/lib/integration/network"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  try {
    const data = await integrationGetJson<unknown>("/Servidor/webservice/integration/produtos/brands")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.data ?? { success: false, message: "Erro na integração" }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
