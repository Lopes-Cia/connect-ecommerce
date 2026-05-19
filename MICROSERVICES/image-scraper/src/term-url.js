function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function isCandidateUrl(value) {
  const url = normalizeUrl(value);
  if (!url) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  if (url.startsWith("data:")) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith(".ico")) return false;
  if (lower.includes("/ip3/")) return false;
  if (lower.includes("/dist/react-assets/")) return false;
  return true;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function pickCandidates(urls, count) {
  const picked = [];
  for (const u of urls) {
    const url = normalizeUrl(u);
    if (!isCandidateUrl(url)) continue;
    picked.push(url);
    if (picked.length >= count) break;
  }
  return picked;
}

async function getVqdForQuery({ query, ua }) {
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const initRes = await fetch(initUrl, { headers: { "user-agent": ua } });
  if (!initRes.ok) return "";
  const initHtml = await initRes.text();
  const vqdMatch =
    initHtml.match(/vqd='([^']+)'/) ??
    initHtml.match(/vqd="([^"]+)"/) ??
    initHtml.match(/vqd=([^&\s"]+)/);
  const vqd = vqdMatch?.[1] ? String(vqdMatch[1]).trim() : "";
  return vqd;
}

function buildQueries({ term, profile, preferTransparent }) {
  const base = String(term || "").trim();
  const normalizedProfile = String(profile || "logo").trim().toLowerCase();
  if (!base) return [];

  if (normalizedProfile !== "logo") return [base];

  const qTransparent = [
    `${base} logo oficial png transparente`,
    `${base} logotipo png transparente`,
  ];
  const qWhite = [
    `${base} logo oficial fundo branco png`,
    `${base} logo fundo branco png`,
  ];
  const qFallback = [
    `${base} brand logo svg`,
    `${base} logomarca vetorial`,
  ];

  const ordered = preferTransparent ? [...qTransparent, ...qWhite, ...qFallback] : [...qWhite, ...qTransparent, ...qFallback];
  return ordered.map((q) => q.trim()).filter(Boolean);
}

export async function findImageUrlsForTerm({ term, count, profile, preferTransparent }) {
  const baseTerm = String(term || "").trim();
  const n = Number.isFinite(Number(count)) ? Math.max(1, Math.min(20, Number(count))) : 3;
  const queries = buildQueries({ term: baseTerm, profile, preferTransparent: preferTransparent !== false });
  if (!queries.length) return { ok: false, term: baseTerm, urls: [], providers: [], queries: [] };

  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

  const urls = [];
  const providers = [];
  const seen = new Set();

  for (const query of queries) {
    if (urls.length >= n) break;
    try {
      const vqd = await getVqdForQuery({ query, ua });
      if (!vqd) continue;

      const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}`;
      const apiRes = await fetch(apiUrl, {
        headers: { "user-agent": ua, accept: "application/json" },
      });
      if (!apiRes.ok) continue;

      const apiData = await apiRes.json().catch(() => null);
      const results = Array.isArray(apiData?.results) ? apiData.results : [];
      const ddgUrls = results.map((r) => r?.image).filter(Boolean);
      const picked = pickCandidates(ddgUrls, n);
      let added = 0;
      for (const u of picked) {
        if (seen.has(u)) continue;
        seen.add(u);
        urls.push(u);
        added += 1;
        if (urls.length >= n) break;
      }
      if (added > 0 && !providers.includes("ddg-api")) providers.push("ddg-api");
    } catch {}
  }

  if (urls.length < n) {
    for (const query of queries) {
      if (urls.length >= n) break;

      let browser = null;
      try {
        const { chromium } = await import("playwright");
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ userAgent: ua });

        const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
        await page.goto(initUrl, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("img", { timeout: 15000 });

        const pageUrls = await page.$$eval("img", (imgs) =>
          imgs
            .map(
              (img) =>
                img.currentSrc ||
                img.src ||
                img.getAttribute("data-src") ||
                img.getAttribute("data-original") ||
                "",
            )
            .filter(Boolean),
        );

        const uniqueUrls = uniq(pageUrls);
        const picked = pickCandidates(uniqueUrls, n);
        let added = 0;
        for (const u of picked) {
          if (seen.has(u)) continue;
          seen.add(u);
          urls.push(u);
          added += 1;
          if (urls.length >= n) break;
        }
        if (added > 0 && !providers.includes("ddg-page")) providers.push("ddg-page");
      } catch {
      } finally {
        try {
          if (browser) await browser.close();
        } catch {}
      }
    }
  }

  return { ok: urls.length > 0, term: baseTerm, urls, providers, queries };
}
