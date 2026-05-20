export function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
}
