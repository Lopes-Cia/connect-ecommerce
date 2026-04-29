import { NextResponse } from "next/server"

import { RawHttpError } from "@/liz_refator/integration/rawClient"
import { clientesRawVerificarToken } from "@/liz_refator/integration/usuariosRaw"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const idIntegradoraParam = searchParams.get("idIntegradora")
  const idIntegradora = idIntegradoraParam ? Number.parseInt(idIntegradoraParam, 10) : undefined

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Missing required query param: token" },
      { status: 400 }
    )
  }

  try {
    const result = await clientesRawVerificarToken({
      token,
      idIntegradora: Number.isNaN(idIntegradora as number) ? undefined : idIntegradora,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof RawHttpError) {
      const status = error.status >= 400 ? error.status : 500
      return NextResponse.json(
        { success: false, message: error.message, request: error.request, data: error.data },
        { status }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
