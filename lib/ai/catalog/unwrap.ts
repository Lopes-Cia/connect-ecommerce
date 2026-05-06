export function unwrapData<T = unknown>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if ("data" in obj) return obj.data as T;
  }
  return payload as T;
}

export function unwrapList(payload: unknown): unknown[] {
  const data = unwrapData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload)) return payload;
  return [];
}

