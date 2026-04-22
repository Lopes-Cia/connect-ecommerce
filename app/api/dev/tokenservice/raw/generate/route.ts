import { NextResponse } from "next/server"

import { getIntegrationEnvConfig } from "@/liz_refator/adapters/integration-config"
import { fetchWithRetry, HttpError, readResponseData } from "@/liz_refator/adapters/integration-network"

export const dynamic = "force-dynamic"

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 })
  }

  const env = getIntegrationEnvConfig()
  const url = `${env.authBaseUrl}/tokenService`
  const body = {
    produto: env.produto,
    ean: env.ean,
    idIntegradora: env.idIntegradora,
    codCli: env.codCli,
  }
  const init = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  }

  try {
    const response = await fetchWithRetry(
      url,
      init,
      { maxAttempts: 3 }
    )

    const data = await readResponseData<unknown>(response)

    if (response.status !== 200) {
      throw new HttpError("Failed to generate token", response.status, url, data)
    }

    return NextResponse.json({
      success: true,
      request: { url, ...init, body },
      data,
    })
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(error.data ?? { success: false, message: "Erro no tokenService" }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Unexpected tokenService error"
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
