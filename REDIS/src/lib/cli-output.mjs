export function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

function redactString(s) {
  const v = String(s);
  return v.replace(/(rediss?:\/\/[^:\s]+:)([^@\s]+)(@)/gi, "$1***$3");
}

function redact(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = redact(v);
  return out;
}

export function fail(message, details = {}) {
  const payload = redact({ ok: false, error: message, ...details });
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = 1;
}
