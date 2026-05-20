"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

type UnknownRecord = Record<string, unknown>;

function getPageName(pathname: string | null): string {
  const raw = String(pathname ?? "").trim();
  if (!raw || raw === "/") return "home";
  const cleaned = raw.startsWith("/") ? raw.slice(1) : raw;
  const first = cleaned.split("/").filter(Boolean)[0] ?? "";
  return first || "home";
}

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function escapeForDoubleQuotes(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export default function ProductImageScraperButton({
  contratoRaw,
  loading,
  sendMessage,
}: {
  contratoRaw: unknown | null;
  loading: boolean;
  sendMessage: (customMessage?: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const pageName = getPageName(pathname);
  const isProductPage = pageName === "produtos" && String(pathname ?? "").split("/").filter(Boolean).length >= 2;

  const command = useMemo(() => {
    const record = asRecord(contratoRaw);
    const name = asString(record?.name).trim();
    const sku = asString(record?.sku).trim();
    const brand = asString(asRecord(record?.brand)?.name).trim();

    const json = JSON.stringify(contratoRaw ?? {}, null, 2);
    const prompt = [
      "quero imagens de fundo branco para um ecommerce, é fundamental para a identificação do produto e uma vitrine atraente.",
      "esses são os dados do meu produto:",
      name ? `nome: ${name}` : "",
      sku ? `sku: ${sku}` : "",
      brand ? `marca: ${brand}` : "",
      json ? `json: ${json}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const quoted = `"${escapeForDoubleQuotes(prompt)}"`;
    return `/img logo ${quoted} --count 1`;
  }, [contratoRaw]);

  if (!isProductPage) return null;

  return (
    <div className="mt-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading || !contratoRaw}
        onClick={() => void sendMessage(command)}
      >
        Buscar imagens para o produto
      </Button>
    </div>
  );
}

