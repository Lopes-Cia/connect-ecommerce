import "server-only";

export interface PixEnvConfig {
  key: string;
  merchantName: string;
  merchantCity: string;
}

function normalizeString(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function readOptionalEnv(key: string): string {
  return normalizeString(process.env[key]);
}

export function getPixEnvConfig(): PixEnvConfig | null {
  const key = readOptionalEnv("PIX_KEY");
  if (!key) return null;

  const merchantName = readOptionalEnv("PIX_MERCHANT_NAME") || "LOJA";
  const merchantCity = readOptionalEnv("PIX_MERCHANT_CITY") || "CIDADE";

  return { key, merchantName, merchantCity };
}
