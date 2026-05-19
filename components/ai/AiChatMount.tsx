"use client";

import dynamic from "next/dynamic";

const FloatingAiChat = dynamic(() => import("@/components/ai/FloatingAiChat"), { ssr: false });

export default function AiChatMount() {
  return <FloatingAiChat />;
}
