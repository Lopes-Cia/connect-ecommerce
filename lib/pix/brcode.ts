function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

function normalizeAscii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, "")
    .trim();
}

function normalizeMerchantName(value: string): string {
  const normalized = normalizeAscii(value).replace(/\s+/g, " ").slice(0, 25).trim();
  return normalized || "LOJA";
}

function normalizeMerchantCity(value: string): string {
  const normalized = normalizeAscii(value).replace(/\s+/g, " ").slice(0, 15).trim();
  return normalized || "CIDADE";
}

function normalizeTxid(value: string): string {
  const normalized = normalizeAscii(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (normalized || "TX").slice(0, 25);
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2);
}

function emvField(id: string, value: string): string {
  const safeId = onlyDigits(id).padStart(2, "0").slice(-2);
  const len = value.length;
  return `${safeId}${String(len).padStart(2, "0")}${value}`;
}

function crc16ccitt(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixCopiaEColaInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  txid: string;
  amount: number;
  description?: string;
  initiationMethod?: "11" | "12";
}

export function buildPixCopiaECola(input: PixCopiaEColaInput): string {
  const merchantName = normalizeMerchantName(input.merchantName);
  const merchantCity = normalizeMerchantCity(input.merchantCity);
  const txid = normalizeTxid(input.txid);

  const pixKey = normalizeAscii(input.pixKey);
  if (!pixKey) {
    throw new Error("PIX key obrigatória para gerar copia e cola.");
  }

  const initiationMethod = input.initiationMethod ?? "12";
  const amount = Math.max(0, input.amount);

  const merchantAccountInfo = [
    emvField("00", "BR.GOV.BCB.PIX"),
    emvField("01", pixKey),
    input.description ? emvField("02", normalizeAscii(input.description).slice(0, 72)) : "",
  ]
    .filter(Boolean)
    .join("");

  const additionalData = emvField("05", txid);

  const payloadNoCrc = [
    emvField("00", "01"),
    emvField("01", initiationMethod),
    emvField("26", merchantAccountInfo),
    emvField("52", "0000"),
    emvField("53", "986"),
    emvField("54", formatAmount(amount)),
    emvField("58", "BR"),
    emvField("59", merchantName),
    emvField("60", merchantCity),
    emvField("62", additionalData),
    "6304",
  ].join("");

  const crc = crc16ccitt(payloadNoCrc);
  return `${payloadNoCrc}${crc}`;
}
