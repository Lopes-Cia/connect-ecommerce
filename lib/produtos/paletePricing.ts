function asFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePositiveInteger(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed == null || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function normalizeNonNegativeInteger(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed == null || parsed < 0) return null;
  return Math.floor(parsed);
}

export function computePaleteValue(price: unknown, qtPalete: unknown): number | null {
  const safePrice = asFiniteNumber(price);
  const safeQtPalete = normalizePositiveInteger(qtPalete);
  if (safePrice == null || safePrice <= 0 || safeQtPalete == null) return null;
  return safePrice * safeQtPalete;
}

export function computeMaxQuantity(stock: unknown, qtPalete: unknown): number {
  const safeStock = asFiniteNumber(stock);
  const safeQtPalete = normalizePositiveInteger(qtPalete);
  if (safeStock == null || safeStock <= 0 || safeQtPalete == null) return 0;
  return Math.max(0, Math.floor(safeStock / safeQtPalete));
}

export function clampQuantityToMax(quantity: unknown, maxQuantity: unknown): number {
  const safeQuantity = normalizePositiveInteger(quantity) ?? 1;
  const safeMaxQuantity = normalizeNonNegativeInteger(maxQuantity);
  if (safeMaxQuantity === 0) return 1;
  if (safeMaxQuantity == null) return safeQuantity;
  return Math.max(1, Math.min(safeQuantity, safeMaxQuantity));
}
