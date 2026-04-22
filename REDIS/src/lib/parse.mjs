export function parseIntStrict(raw, name) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n)) throw new Error(`${name} inválido`);
  return n;
}

export function parseNumberStrict(raw, name) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(String(raw));
  if (!Number.isFinite(n)) throw new Error(`${name} inválido`);
  return n;
}

export function parseBoolStrict(raw, name) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const v = String(raw).toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  throw new Error(`${name} inválido (use true/false)`);
}

