import { NextResponse } from 'next/server'

import { clearSession } from '@/lib/auth/session'

export async function POST() {
  try {
    await clearSession()

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected logout error'

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    )
  }
}
