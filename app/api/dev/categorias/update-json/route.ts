import { NextResponse } from "next/server"

import { getBackListCategoria } from "@/lib/integration/lopesBackClient"
import { HttpError } from "@/lib/integration/network"
import { translateLopesCategoriasToCategorias } from "@/lib/mockups/syncDataFromBackToFront"

export const dynamic = "force-dynamic"

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  try {
    const raw = await getBackListCategoria()
    const categorias = translateLopesCategoriasToCategorias(raw)

    const fs = await import("node:fs/promises")
    const path = await import("node:path")

    const filePath = path.join(process.cwd(), "lib", "mockups", "data", "categorias.json")
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, `${JSON.stringify(categorias, null, 2)}\n`, "utf8")

    return NextResponse.json({
      success: true,
      data: {
        file: "lib/mockups/data/categorias.json",
        count: categorias.length,
        wroteAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        error.data ?? { success: false, message: "Erro na integração (lopes back)" },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : "Unexpected integration error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

