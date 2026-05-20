function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractDigits(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits;
}

function extractGtinFromSku(sku) {
  const raw = String(sku || "").trim();
  const prefix = raw.split("-")[0] || raw;
  const digits = extractDigits(prefix);
  if (digits.length >= 8 && digits.length <= 14) return digits;
  if (digits.length > 14) return digits.slice(0, 14);
  return digits;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function buildRequestHeaders() {
  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
}

function buildJsonHeaders() {
  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    accept: "application/json,text/plain,*/*",
  };
}

async function fetchTextWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: buildRequestHeaders(), redirect: "follow", signal: controller.signal });
    const ok = Boolean(res?.ok);
    const status = Number(res?.status || 0);
    const contentType = String(res?.headers?.get?.("content-type") || "");
    const text = await res.text().catch(() => "");
    return { ok, status, contentType, text };
  } catch (e) {
    return { ok: false, status: 0, contentType: "", text: "", error: e instanceof Error ? e.message : "fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: buildJsonHeaders(), redirect: "follow", signal: controller.signal });
    const ok = Boolean(res?.ok);
    const status = Number(res?.status || 0);
    const contentType = String(res?.headers?.get?.("content-type") || "");
    const json = await res.json().catch(() => null);
    return { ok, status, contentType, json };
  } catch (e) {
    return { ok: false, status: 0, contentType: "", json: null, error: e instanceof Error ? e.message : "fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}

function decodeDuckDuckGoRedirect(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  try {
    if (u.startsWith("/l/?")) {
      const parsed = new URL(`https://duckduckgo.com${u}`);
      const uddg = parsed.searchParams.get("uddg");
      return uddg ? decodeURIComponent(uddg) : "";
    }
    if (u.startsWith("https://duckduckgo.com/l/?")) {
      const parsed = new URL(u);
      const uddg = parsed.searchParams.get("uddg");
      return uddg ? decodeURIComponent(uddg) : "";
    }
  } catch {}
  return u;
}

function isValidHttpUrl(u) {
  const url = String(u || "").trim();
  return url.startsWith("https://") || url.startsWith("http://");
}

function normalizeCandidateUrl(u) {
  const decoded = decodeDuckDuckGoRedirect(u);
  const url = String(decoded || "").trim();
  if (!isValidHttpUrl(url)) return "";
  const lower = url.toLowerCase();
  if (lower.includes("duckduckgo.com")) return "";
  if (lower.endsWith(".pdf")) return "";
  return url;
}

function parseDuckDuckGoHtmlResultUrls(html) {
  const urls = [];
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    const normalized = normalizeCandidateUrl(raw);
    if (!normalized) continue;
    urls.push(normalized);
  }
  return uniq(urls);
}

async function searchDuckDuckGoPagesViaPlaywright({ query, limit }) {
  const q = normalizeText(query);
  if (!q) return { ok: false, urls: [], query: q, provider: "ddg-playwright" };
  const n = Math.max(1, Math.min(30, Number(limit || 10)));

  let browser = null;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    });
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&ia=web`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("a", { timeout: 15000 });

    const hrefs = await page.$$eval(
      'a[data-testid="result-title-a"], a.result__a, a[data-testid="result-title-link"]',
      (links) => links.map((a) => a.getAttribute("href") || "").filter(Boolean),
    ).catch(() => []);

    const urls = uniq(hrefs.map((u) => normalizeCandidateUrl(u)).filter(Boolean)).slice(0, n);
    return { ok: urls.length > 0, urls, query: q, provider: "ddg-playwright" };
  } catch {
    return { ok: false, urls: [], query: q, provider: "ddg-playwright" };
  } finally {
    try {
      if (browser) await browser.close();
    } catch {}
  }
}

async function searchDuckDuckGoPages({ query, limit }) {
  const q = normalizeText(query);
  if (!q) return { ok: false, urls: [], query: q, provider: "ddg-html" };
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const fetched = await fetchTextWithTimeout(url, 12000);
  if (fetched.ok && fetched.text) {
    const urls = parseDuckDuckGoHtmlResultUrls(fetched.text).slice(0, Math.max(1, Math.min(30, Number(limit || 10))));
    if (urls.length > 0) return { ok: true, urls, query: q, provider: "ddg-html" };
  }
  return searchDuckDuckGoPagesViaPlaywright({ query: q, limit });
}

async function searchMercadoLivreUrlsViaPlaywright({ query, limit }) {
  const q = normalizeText(query);
  if (!q) return { ok: false, urls: [], query: q, provider: "ml-playwright" };
  const n = Math.max(1, Math.min(20, Number(limit || 8)));

  const slug = q.toLowerCase().replace(/\s+/g, "-");
  const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}`;

  let browser = null;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("a", { timeout: 20000 });

    const hrefs = await page.$$eval("a", (links) =>
      links.map((a) => a.getAttribute("href") || "").filter(Boolean),
    ).catch(() => []);

    const candidates = hrefs
      .map((h) => String(h || "").trim())
      .filter((h) => h.startsWith("http"))
      .filter((h) => h.includes("mercadolivre.com.br/"))
      .filter((h) => h.includes("/MLB-") || h.includes("produto.mercadolivre.com.br/"))
      .filter((h) => !h.includes("/l/"))
      .map((h) => h.split("#")[0])
      .map((h) => h.split("?")[0]);

    const urls = uniq(candidates).slice(0, n);
    return { ok: urls.length > 0, urls, query: q, provider: "ml-playwright" };
  } catch {
    return { ok: false, urls: [], query: q, provider: "ml-playwright" };
  } finally {
    try {
      if (browser) await browser.close();
    } catch {}
  }
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = String(m[1] || "").trim();
    if (!raw) continue;
    blocks.push(raw);
  }
  return blocks;
}

function tryParseJson(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function flattenJsonLd(parsed) {
  const out = [];
  const pushAny = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const item of v) pushAny(item);
      return;
    }
    if (typeof v === "object") {
      if (Array.isArray(v["@graph"])) {
        for (const item of v["@graph"]) pushAny(item);
        return;
      }
      out.push(v);
    }
  };
  pushAny(parsed);
  return out;
}

function hasProductType(obj) {
  const t = obj?.["@type"];
  if (!t) return false;
  if (Array.isArray(t)) return t.map((x) => String(x).toLowerCase()).includes("product");
  return String(t).toLowerCase() === "product";
}

function normalizeBrand(value) {
  if (!value) return "";
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) return normalizeBrand(value[0]);
  if (typeof value === "object") {
    const name = value?.name || value?.legalName || value?.alternateName;
    return normalizeText(name);
  }
  return "";
}

function normalizeImage(value) {
  if (!value) return "";
  if (typeof value === "string") return String(value).trim();
  if (Array.isArray(value)) return normalizeImage(value[0]);
  if (typeof value === "object") return normalizeImage(value?.url);
  return "";
}

function normalizeGtin(value) {
  const digits = extractDigits(value);
  if (digits.length === 13 || digits.length === 14) return digits;
  return "";
}

function extractProductCandidateFromJsonLd(obj) {
  if (!hasProductType(obj)) return null;
  const name = normalizeText(obj?.name);
  const brand = normalizeBrand(obj?.brand);
  const image = normalizeImage(obj?.image);
  const gtin =
    normalizeGtin(obj?.gtin13) ||
    normalizeGtin(obj?.gtin14) ||
    normalizeGtin(obj?.gtin) ||
    normalizeGtin(obj?.gtin12) ||
    "";
  return { name, brand, image, gtin };
}

const TRUSTED_SOURCE_REGEX = /(vtex|supermercado|carrefour|atacadao|paguemenos|paodeacucar|imigrantes|vinho|adega|bebidas|mercafacil|catalog|ecommerce)/i;
const LOW_QUALITY_SOURCE_REGEX = /(freepik|dreamstime|shutterstock|depositphotos|alamy|istock|pinterest|wikimedia)/i;

function scoreCandidate({ expectedGtin, url, candidate, source }) {
  let score = 0;
  const text = `${url || ""} ${candidate?.name || ""} ${candidate?.brand || ""}`.toLowerCase();
  if (TRUSTED_SOURCE_REGEX.test(text)) score += 3;
  if (LOW_QUALITY_SOURCE_REGEX.test(text)) score -= 4;
  if (candidate?.name) score += 3;
  if (candidate?.brand) score += 2;
  if (candidate?.image) score += 1;
  if (candidate?.gtin) score += 2;
  if (source === "json-ld") score += 2;
  if (source === "openfoodfacts") score += 6;
  if (expectedGtin && candidate?.gtin === expectedGtin) score += 100;
  return score;
}

async function openFoodFactsByGtin(gtin) {
  const code = extractDigits(gtin);
  if (!code) return { ok: false, candidate: null, provider: "openfoodfacts" };
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;
  const fetched = await fetchJsonWithTimeout(url, 12000);
  const status = Number(fetched?.json?.status || 0);
  if (!fetched.ok || status !== 1) return { ok: false, candidate: null, provider: "openfoodfacts" };
  const p = fetched.json?.product || {};
  const name = normalizeText(p?.product_name || p?.product_name_pt || p?.generic_name || "");
  const brand = normalizeText(p?.brands || "");
  const image = normalizeImage(p?.image_front_url || p?.image_url || p?.image_front_small_url || "");
  const candidate = { name, brand, image, gtin: normalizeGtin(code) || code };
  return { ok: Boolean(candidate.gtin), candidate, provider: "openfoodfacts", url };
}

async function openFoodFactsSearchByName(name) {
  const q = normalizeText(name);
  if (!q) return { ok: false, candidates: [], provider: "openfoodfacts" };
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12`;
  const fetched = await fetchJsonWithTimeout(url, 12000);
  const items = Array.isArray(fetched?.json?.products) ? fetched.json.products : [];
  const candidates = items
    .map((p) => {
      const code = normalizeGtin(p?.code) || "";
      if (!code) return null;
      const candidate = {
        name: normalizeText(p?.product_name || p?.product_name_pt || p?.generic_name || ""),
        brand: normalizeText(p?.brands || ""),
        image: normalizeImage(p?.image_front_url || p?.image_url || p?.image_front_small_url || ""),
        gtin: code,
      };
      const score = scoreCandidate({ expectedGtin: "", url: "openfoodfacts", candidate, source: "openfoodfacts" });
      return { url: "openfoodfacts", query: q, provider: "openfoodfacts", source: "openfoodfacts", score, ...candidate };
    })
    .filter(Boolean);
  return { ok: candidates.length > 0, candidates, provider: "openfoodfacts", url };
}

function extractGtinCandidatesFromText(html) {
  const text = String(html || "");
  const matches = text.match(/\b\d{13,14}\b/g) || [];
  const uniqMatches = uniq(matches);
  return uniqMatches.slice(0, 5);
}

async function extractCandidatesFromUrl({ url, expectedGtin, query, provider }) {
  const fetched = await fetchTextWithTimeout(url, 12000);
  const sources = [];
  if (!fetched.ok || !fetched.text) return { ok: false, candidates: [], sources };
  const html = fetched.text;
  const blocks = extractJsonLdBlocks(html);
  const candidates = [];
  for (const block of blocks) {
    const parsed = tryParseJson(block);
    if (!parsed) continue;
    for (const obj of flattenJsonLd(parsed)) {
      const c = extractProductCandidateFromJsonLd(obj);
      if (!c) continue;
      const score = scoreCandidate({ expectedGtin, url, candidate: c, source: "json-ld" });
      candidates.push({ url, query, provider, source: "json-ld", score, ...c });
    }
  }
  if (candidates.length > 0) {
    sources.push({ url, ok: true, status: fetched.status, contentType: fetched.contentType, found: candidates.length });
    return { ok: true, candidates, sources };
  }

  const gtins = extractGtinCandidatesFromText(html);
  for (const gtin of gtins) {
    const c = { name: "", brand: "", image: "", gtin };
    const score = scoreCandidate({ expectedGtin, url, candidate: c, source: "regex" });
    candidates.push({ url, query, provider, source: "regex", score, ...c });
  }
  sources.push({ url, ok: true, status: fetched.status, contentType: fetched.contentType, found: candidates.length });
  return { ok: candidates.length > 0, candidates, sources };
}

function pickBestCandidate(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const sorted = [...list].sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
  const best = sorted[0] || null;
  return { best, sorted };
}

export async function lookupBySku({ sku, maxUrls, maxQueries, maxCandidates } = {}) {
  const inputSku = String(sku || "").trim();
  const gtin = extractGtinFromSku(inputSku);
  const sources = [];
  const candidates = [];
  const off = await openFoodFactsByGtin(gtin);
  sources.push({ provider: "openfoodfacts", query: gtin, ok: off.ok, count: off.ok ? 1 : 0 });
  if (off.ok && off.candidate) {
    const score = scoreCandidate({ expectedGtin: gtin, url: off.url || "openfoodfacts", candidate: off.candidate, source: "openfoodfacts" });
    candidates.push({
      url: off.url || "openfoodfacts",
      query: gtin,
      provider: "openfoodfacts",
      source: "openfoodfacts",
      score,
      ...off.candidate,
    });
  }

  const queries = uniq(
    [
      gtin ? `${gtin} gtin ean produto` : "",
      gtin ? `${gtin} produto site` : "",
      gtin ? `${gtin} embalagem` : "",
    ].map((q) => normalizeText(q)).filter(Boolean),
  ).slice(0, Math.max(1, Math.min(5, Number(maxQueries || 3))));
  if (!gtin || !queries.length) {
    return { ok: false, mode: "lookup-sku", inputSku, gtin, queries, candidates: [], best: null, sources: [], error: "invalid_gtin" };
  }

  if (candidates.length > 0) {
    const picked = pickBestCandidate(candidates);
    return {
      ok: Boolean(picked.best),
      mode: "lookup-sku",
      inputSku,
      gtin,
      queries,
      best: picked.best,
      candidates: picked.sorted,
      sources,
    };
  }

  const ml = await searchMercadoLivreUrlsViaPlaywright({ query: gtin, limit: maxUrls || 6 });
  sources.push({ provider: ml.provider, query: gtin, ok: ml.ok, count: ml.urls.length });
  if (ml.ok) {
    for (const url of ml.urls) {
      const res = await extractCandidatesFromUrl({ url, expectedGtin: gtin, query: gtin, provider: ml.provider });
      for (const c of res.candidates) candidates.push(c);
    }
    const limited = candidates.slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 80))));
    const picked = pickBestCandidate(limited);
    if (picked.best) {
      return {
        ok: true,
        mode: "lookup-sku",
        inputSku,
        gtin,
        queries,
        best: picked.best,
        candidates: picked.sorted,
        sources,
      };
    }
  }

  const allUrls = [];
  for (const query of queries) {
    const found = await searchDuckDuckGoPages({ query, limit: maxUrls || 10 });
    sources.push({ provider: found.provider, query, ok: found.ok, count: found.urls.length });
    for (const u of found.urls) allUrls.push(u);
  }
  const urls = uniq(allUrls).slice(0, Math.max(1, Math.min(20, Number(maxUrls || 10))));
  if (!urls.length) {
    return { ok: false, mode: "lookup-sku", inputSku, gtin, queries, candidates: [], best: null, sources, error: "no_urls" };
  }

  for (const url of urls) {
    const res = await extractCandidatesFromUrl({ url, expectedGtin: gtin, query: gtin, provider: "ddg-pages" });
    for (const c of res.candidates) candidates.push(c);
  }
  const limited = candidates.slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 80))));
  const picked = pickBestCandidate(limited);
  return {
    ok: Boolean(picked.best),
    mode: "lookup-sku",
    inputSku,
    gtin,
    queries,
    best: picked.best,
    candidates: picked.sorted,
    sources,
  };
}

export async function lookupByName({ name, maxUrls, maxQueries, maxCandidates } = {}) {
  const inputName = normalizeText(name);
  const sources = [];
  const candidates = [];
  const off = await openFoodFactsSearchByName(inputName);
  sources.push({ provider: "openfoodfacts", query: inputName, ok: off.ok, count: off.candidates.length });
  for (const c of off.candidates) candidates.push(c);

  const queries = uniq(
    [
      inputName ? `${inputName} gtin ean` : "",
      inputName ? `${inputName} código de barras` : "",
      inputName ? `${inputName} gtin13` : "",
    ].map((q) => normalizeText(q)).filter(Boolean),
  ).slice(0, Math.max(1, Math.min(5, Number(maxQueries || 3))));
  if (!inputName || !queries.length) {
    return { ok: false, mode: "lookup-name", query: inputName, gtin: "", queries, candidates: [], best: null, sources: [], error: "empty_query" };
  }

  if (candidates.length > 0) {
    const limited = candidates.slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 80))));
    const picked = pickBestCandidate(limited);
    const bestGtin = picked.best?.gtin || "";
    return {
      ok: Boolean(bestGtin),
      mode: "lookup-name",
      query: inputName,
      gtin: bestGtin,
      queries,
      best: picked.best,
      candidates: picked.sorted,
      sources,
    };
  }

  const ml = await searchMercadoLivreUrlsViaPlaywright({ query: inputName, limit: maxUrls || 6 });
  sources.push({ provider: ml.provider, query: inputName, ok: ml.ok, count: ml.urls.length });
  if (ml.ok) {
    for (const url of ml.urls) {
      const res = await extractCandidatesFromUrl({ url, expectedGtin: "", query: inputName, provider: ml.provider });
      for (const c of res.candidates) candidates.push(c);
    }
    const filtered = candidates.filter((c) => Boolean(c?.gtin));
    const limited = filtered.slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 80))));
    const picked = pickBestCandidate(limited);
    const bestGtin = picked.best?.gtin || "";
    if (bestGtin) {
      return {
        ok: true,
        mode: "lookup-name",
        query: inputName,
        gtin: bestGtin,
        queries,
        best: picked.best,
        candidates: picked.sorted,
        sources,
      };
    }
  }

  const allUrls = [];
  for (const query of queries) {
    const found = await searchDuckDuckGoPages({ query, limit: maxUrls || 10 });
    sources.push({ provider: found.provider, query, ok: found.ok, count: found.urls.length });
    for (const u of found.urls) allUrls.push(u);
  }
  const urls = uniq(allUrls).slice(0, Math.max(1, Math.min(20, Number(maxUrls || 10))));
  if (!urls.length) {
    return { ok: false, mode: "lookup-name", query: inputName, gtin: "", queries, candidates: [], best: null, sources, error: "no_urls" };
  }

  for (const url of urls) {
    const res = await extractCandidatesFromUrl({ url, expectedGtin: "", query: inputName, provider: "ddg-pages" });
    for (const c of res.candidates) candidates.push(c);
  }
  const filtered = candidates.filter((c) => Boolean(c?.gtin));
  const limited = filtered.slice(0, Math.max(1, Math.min(200, Number(maxCandidates || 80))));
  const picked = pickBestCandidate(limited);
  const bestGtin = picked.best?.gtin || "";
  return {
    ok: Boolean(bestGtin),
    mode: "lookup-name",
    query: inputName,
    gtin: bestGtin,
    queries,
    best: picked.best,
    candidates: picked.sorted,
    sources,
  };
}
