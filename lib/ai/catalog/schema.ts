export type CatalogFieldType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "array"
  | "object"
  | "unknown";

export type CatalogFieldSchema = {
  name: string;
  type: CatalogFieldType;
  examples?: string[];
};

export type CatalogSchema = {
  fields: CatalogFieldSchema[];
};

function typeOfValue(value: unknown): CatalogFieldType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string") return "string";
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "object") return "object";
  return "unknown";
}

function stableExample(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.slice(0, 80);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return "{...}";
  return null;
}

export function buildSchemaFromSample(sample: unknown[]): CatalogSchema {
  const map = new Map<string, { type: CatalogFieldType; examples: Set<string> }>();

  for (const item of sample) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    for (const [key, value] of Object.entries(item as Record<string, unknown>)) {
      const t = typeOfValue(value);
      const ex = stableExample(value);
      const current = map.get(key);
      if (!current) {
        const examples = new Set<string>();
        if (ex) examples.add(ex);
        map.set(key, { type: t, examples });
        continue;
      }
      if (current.type === "null" && t !== "null") current.type = t;
      if (ex && current.examples.size < 3) current.examples.add(ex);
    }
  }

  const fields: CatalogFieldSchema[] = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, meta]) => ({
      name,
      type: meta.type,
      examples: meta.examples.size ? Array.from(meta.examples) : undefined,
    }));

  return { fields };
}

export function pickSample(items: unknown[], size: number): unknown[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const limit = Math.max(0, Math.min(size, items.length));
  if (limit === 0) return [];
  return items.slice(0, limit);
}

