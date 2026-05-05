import { NextResponse } from "next/server";

import { getPixEnvConfig } from "@/lib/pix/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getPixEnvConfig();
  if (!config) {
    return NextResponse.json({ success: true, data: null });
  }
  return NextResponse.json({
    success: true,
    data: {
      key: config.key,
      merchantName: config.merchantName,
      merchantCity: config.merchantCity,
    },
  });
}
