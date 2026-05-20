import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { normalizeUrl } from "./config.js";
import { downloadToFile, ensureDir, extFromUrl, slugify } from "./file-utils.js";

function uniqByUrl(items) {
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (!it?.url) continue;
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
  }
  return out;
}

function extractBgColor(styleAttr, styleValue) {
  const direct = String(styleValue || "").trim();
  if (direct) return direct;
  const raw = String(styleAttr || "");
  const m = raw.match(/background-color\s*:\s*([^;]+)/i);
  return String(m?.[1] || "").trim();
}

export async function buildHomeJson({
  url,
  outPath,
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  const startUrl = normalizeUrl(url);
  if (!startUrl) throw new Error("url inválida");

  const baseAssetsDir = path.resolve(process.cwd(), "data/assets/files");

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });

  const primarySelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div > section > div.listing > ul";
  let container = page.locator(primarySelector);
  if ((await container.count()) === 0) {
    container = page.locator("section .listing ul");
  }
  await container.first().waitFor({ state: "attached", timeout: timeoutMs });

  const rawItems = await container.first().locator("li").evaluateAll((lis) =>
    lis
      .map((li) => {
        const box = li.querySelector("div.box-image") || li.querySelector("div");
        const a = li.querySelector("a[href]");
        const img = li.querySelector("img");

        const nome =
          (a?.getAttribute("title") || "").trim() ||
          (img?.getAttribute("alt") || "").trim() ||
          (img?.getAttribute("title") || "").trim();

        const href = (a?.getAttribute("href") || "").trim();
        const src = (img?.getAttribute("src") || "").trim();

        const styleAttr = box?.getAttribute("style") || "";
        const styleValue = box?.style?.backgroundColor || "";
        const backgroundColor = (() => {
          const direct = String(styleValue || "").trim();
          if (direct) return direct;
          const raw = String(styleAttr || "");
          const m = raw.match(/background-color\s*:\s*([^;]+)/i);
          return String(m?.[1] || "").trim();
        })();

        return {
          nome,
          imagem: src,
          css: { backgroundColor },
          url: href
        };
      })
      .filter((x) => x.url),
  );

  await browser.close();

  const normalized = [];
  for (const it of rawItems) {
    let absUrl = "";
    let absImg = "";
    try {
      absUrl = normalizeUrl(new URL(it.url, startUrl).toString());
    } catch {
      absUrl = "";
    }
    try {
      absImg = normalizeUrl(new URL(it.imagem, startUrl).toString());
    } catch {
      absImg = "";
    }

    const nome = String(it.nome || "").trim();
    const backgroundColor = extractBgColor("", it?.css?.backgroundColor);
    if (!absUrl) continue;
    normalized.push({
      nome,
      imagem: absImg,
      css: { backgroundColor },
      url: absUrl
    });
  }

  const brands = uniqByUrl(normalized);
  const totalBrands = brands.length;
  for (let i = 0; i < totalBrands; i += 1) {
    const b = brands[i];
    const nomeSlug = slugify(b?.nome);
    if (!nomeSlug) continue;
    const brandDir = path.join(baseAssetsDir, nomeSlug);
    await ensureDir(brandDir);
    const ext = extFromUrl(b?.imagem) || ".png";
    if (b?.imagem) {
      log(`brand ${i + 1} de ${totalBrands}: ${b.nome}`);
      await downloadToFile(b.imagem, path.join(brandDir, `logo${ext}`));
    }
  }

  const payload = { "Marcas de Mercado": brands };

  const absOut = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);
  await fs.mkdir(path.dirname(absOut), { recursive: true });
  await fs.writeFile(absOut, JSON.stringify(payload, null, 2));

  return payload;
}
