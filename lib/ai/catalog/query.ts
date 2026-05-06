import { z } from "zod";

const FilterOpSchema = z.enum([
  "==",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "contains",
  "in",
  "exists",
  "isEmpty",
]);

const FilterSchema = z.object({
  field: z.string().min(1),
  op: FilterOpSchema,
  value: z.any().optional(),
});

const QuerySpecSchema = z.object({
  intent: z.enum(["count", "list", "group_by", "unknown"]),
  filters: z.array(FilterSchema).optional().default([]),
  groupBy: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  notes: z.string().optional(),
});

export type CatalogQuerySpec = z.infer<typeof QuerySpecSchema>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function includesInsensitive(haystack: unknown, needle: unknown): boolean {
  const h = normalizeString(haystack)?.toLowerCase();
  const n = normalizeString(needle)?.toLowerCase();
  if (!h || !n) return false;
  return h.includes(n);
}

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const an = toNumber(a);
  const bn = toNumber(b);
  if (an !== null && bn !== null) return an === bn;
  const as = normalizeString(a);
  const bs = normalizeString(b);
  if (as !== null && bs !== null) return as === bs;
  return String(a) === String(b);
}

function compareNumber(a: unknown, b: unknown): number | null {
  const an = toNumber(a);
  const bn = toNumber(b);
  if (an === null || bn === null) return null;
  if (an === bn) return 0;
  return an > bn ? 1 : -1;
}

function valueIn(value: unknown, list: unknown): boolean {
  if (!Array.isArray(list)) return false;
  return list.some((x) => eq(value, x));
}

function applyFilter(item: Record<string, unknown>, filter: CatalogQuerySpec["filters"][number]): boolean {
  const value = item[filter.field];
  if (filter.op === "exists") return value !== null && value !== undefined;
  if (filter.op === "isEmpty") return isEmptyValue(value);
  if (filter.op === "contains") return includesInsensitive(value, filter.value);
  if (filter.op === "in") return valueIn(value, filter.value);
  if (filter.op === "==") return eq(value, filter.value);
  if (filter.op === "!=") return !eq(value, filter.value);

  const cmp = compareNumber(value, filter.value);
  if (cmp === null) return false;
  if (filter.op === ">") return cmp > 0;
  if (filter.op === ">=") return cmp >= 0;
  if (filter.op === "<") return cmp < 0;
  if (filter.op === "<=") return cmp <= 0;
  return false;
}

function applyFilters(items: unknown[], filters: CatalogQuerySpec["filters"]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const raw of items) {
    const item = asRecord(raw);
    if (!item) continue;
    let ok = true;
    for (const filter of filters) {
      if (!applyFilter(item, filter)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(item);
  }
  return out;
}

export function parseCatalogQuerySpec(input: unknown): { ok: true; spec: CatalogQuerySpec } | { ok: false; error: string } {
  const parsed = QuerySpecSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  return { ok: true, spec: parsed.data };
}

export function executeCatalogQuery(items: unknown[], spec: CatalogQuerySpec): Record<string, unknown> {
  const filtered = applyFilters(items, spec.filters ?? []);

  if (spec.intent === "count") {
    return {
      intent: "count",
      total: filtered.length,
      filters: spec.filters ?? [],
    };
  }

  if (spec.intent === "list") {
    const limit = spec.limit ?? 20;
    return {
      intent: "list",
      total: filtered.length,
      limit,
      items: filtered.slice(0, limit),
      filters: spec.filters ?? [],
    };
  }

  if (spec.intent === "group_by") {
    const groupBy = spec.groupBy;
    if (!groupBy) {
      return { intent: "group_by", error: "groupBy ausente", filters: spec.filters ?? [] };
    }
    const counts = new Map<string, number>();
    for (const item of filtered) {
      const key = item[groupBy];
      const label =
        typeof key === "string" ? (key.trim() || "—") : key === null || key === undefined ? "—" : String(key);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const limit = spec.limit ?? 10;
    const groups = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => ({ key, count }));
    return {
      intent: "group_by",
      groupBy,
      total: filtered.length,
      limit,
      groups,
      filters: spec.filters ?? [],
    };
  }

  return { intent: "unknown", notes: spec.notes ?? "", filters: spec.filters ?? [] };
}

