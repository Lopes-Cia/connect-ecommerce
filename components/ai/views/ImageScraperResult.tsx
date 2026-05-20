"use client";

type ImageScraperItem = {
  ok?: unknown;
  url?: unknown;
  savedPath?: unknown;
  bytes?: unknown;
  contentType?: unknown;
  width?: unknown;
  height?: unknown;
  status?: unknown;
  error?: unknown;
};

type ImageScraperResult = {
  runId?: unknown;
  profile?: unknown;
  term?: unknown;
  countRequested?: unknown;
  items?: unknown;
};

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : String(value ?? "");
}

function pickFilename(savedPath: string) {
  const normalized = savedPath.replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^`+|`+$/g, "").trim();
}

export default function ImageScraperResultView({ result }: { result: ImageScraperResult }) {
  const itemsRaw = Array.isArray(result.items) ? (result.items as ImageScraperItem[]) : [];
  const items = itemsRaw.filter((it) => Boolean(it && typeof it === "object"));

  const term = asString(result.term).trim();
  const profile = asString(result.profile).trim();
  const countRequested = asNumber(result.countRequested);

  if (!items.length) return null;

  return (
    <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-900">
            Imagens encontradas {term ? `· ${term}` : ""}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {profile ? `profile=${profile}` : ""}
            {countRequested ? ` · count=${countRequested}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((raw, index) => {
          const ok = Boolean(raw?.ok);
          const savedPath = asString(raw?.savedPath);
          const filename = pickFilename(savedPath);
          const src = filename ? `/api/ai/image-scraper/terms/${encodeURIComponent(filename)}` : "";
          const sourceUrl = normalizeUrl(asString(raw?.url));

          return (
            <div key={`${filename || "item"}-${index}`} className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="relative aspect-square bg-zinc-50">
                {src ? (
                  <img
                    src={src}
                    alt={term ? `Imagem: ${term}` : "Imagem"}
                    className="absolute inset-0 h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      const target = event.currentTarget;
                      const current = target.currentSrc || target.src || "";
                      if (sourceUrl && current !== sourceUrl && !target.dataset.fallbackApplied) {
                        target.dataset.fallbackApplied = "1";
                        target.src = sourceUrl;
                        return;
                      }
                      if (!target.src.endsWith("/logo.png")) {
                        target.src = "/logo.png";
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-500">Sem preview</div>
                )}
              </div>

              <div className="space-y-1 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-medium text-zinc-900">{filename || "arquivo"}</p>
                  <span
                    className={
                      ok
                        ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                        : "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                    }
                  >
                    {ok ? "OK" : "ERRO"}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600">
                  {asNumber(raw?.bytes) ? `${asNumber(raw?.bytes)} bytes` : ""}
                  {asString(raw?.contentType).trim() ? ` · ${asString(raw?.contentType).trim()}` : ""}
                  {asNumber(raw?.status) ? ` · HTTP ${asNumber(raw?.status)}` : ""}
                </p>

                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[11px] text-blue-700 hover:underline"
                  >
                    {sourceUrl}
                  </a>
                ) : null}

                {!ok && asString(raw?.error).trim() ? (
                  <p className="text-[11px] text-rose-700">{asString(raw?.error).trim()}</p>
                ) : null}

                {savedPath ? (
                  <p className="truncate font-mono text-[10px] text-zinc-500">{savedPath}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
