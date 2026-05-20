import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { normalizeUrl } from "../config.js";
import { downloadToFile, ensureDir, extFromUrl, slugify } from "../file-utils.js";

function extractBgColor(styleAttr, styleValue) {
  const direct = String(styleValue || "").trim();
  if (direct) return direct;
  const raw = String(styleAttr || "");
  const m = raw.match(/background-color\s*:\s*([^;]+)/i);
  return String(m?.[1] || "").trim();
}

function normalizeMaybeUrl(raw, baseUrl) {
  const val = String(raw || "").trim();
  if (!val) return "";
  try {
    return normalizeUrl(new URL(val, baseUrl).toString());
  } catch {
    return "";
  }
}

export async function buildMarcasJson({
  url = "https://www.catalogoambev.com.br/site",
  outPath = "data/output/marcas.json",
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  const abs = path.isAbsolute(outPath) ? outPath : path.resolve(process.cwd(), outPath);

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  try {
    if (typeof log === "function") log(`home: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    const containerSelector =
      "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div > section > div.listing > ul";

    const container = page.locator(containerSelector).first();
    await container.waitFor({ state: "attached", timeout: timeoutMs });

    const items = await container.locator("li").evaluateAll((lis) =>
      lis
        .map((li) => {
          const box = li.querySelector("div.box-image");
          const a = li.querySelector("div.box-image a[href]");
          const img = li.querySelector("img.box-image-logo");

          const aTitle = (a?.getAttribute("title") || "").trim();
          const imgAlt = (img?.getAttribute("alt") || "").trim();
          const imgTitle = (img?.getAttribute("title") || "").trim();

          const nome = aTitle || imgAlt || imgTitle;
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
        .filter((x) => x?.url),
    );

    const normalized = [];
    const seen = new Set();
    for (const it of items) {
      const brandUrl = normalizeMaybeUrl(it.url, url);
      if (!brandUrl) continue;
      if (seen.has(brandUrl)) continue;
      seen.add(brandUrl);

      const imagem = normalizeMaybeUrl(it.imagem, url);
      const nome = String(it.nome || "").trim();
      const backgroundColor = extractBgColor("", it?.css?.backgroundColor);

      normalized.push({
        nome,
        imagem,
        css: { backgroundColor },
        url: brandUrl
      });
    }

    const payload = { "Marcas de Mercado": normalized };
    await fs.writeFile(abs, JSON.stringify(payload, null, 2));
    return payload;
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function processMarcasStage2({
  marcasPath = "data/output/marcas.json",
  assetsDir = "data/assets/files",
  log = () => {}
}) {
  const marcasAbs = path.isAbsolute(marcasPath) ? marcasPath : path.resolve(process.cwd(), marcasPath);
  const assetsAbs = path.isAbsolute(assetsDir) ? assetsDir : path.resolve(process.cwd(), assetsDir);

  const payload = JSON.parse(await fs.readFile(marcasAbs, "utf8"));
  const list = payload?.["Marcas de Mercado"];
  if (!Array.isArray(list)) throw new Error("marcas.json inválido: falta \"Marcas de Mercado\" (array)");

  const total = list.length;
  const errors = [];
  let processed = 0;

  for (let i = 0; i < total; i += 1) {
    const item = list[i];
    const nome = String(item?.nome || "").trim();
    const slug = slugify(nome);
    if (!slug) {
      errors.push({ index: i, nome, error: "slug inválido" });
      continue;
    }

    const brandDir = path.join(assetsAbs, slug);
    await ensureDir(brandDir);

    if (typeof log === "function") log(`marca ${i + 1} de ${total}: pasta (${nome})`);
    processed += 1;
  }

  return { total, processed, errors };
}

export async function processMarcasStage3({
  marcasPath = "data/output/marcas.json",
  assetsDir = "data/assets/files",
  filaPath = "data/output/fila.json",
  log = () => {}
}) {
  const marcasAbs = path.isAbsolute(marcasPath) ? marcasPath : path.resolve(process.cwd(), marcasPath);
  const assetsAbs = path.isAbsolute(assetsDir) ? assetsDir : path.resolve(process.cwd(), assetsDir);
  const filaAbs = path.isAbsolute(filaPath) ? filaPath : path.resolve(process.cwd(), filaPath);

  const payload = JSON.parse(await fs.readFile(marcasAbs, "utf8"));
  const list = payload?.["Marcas de Mercado"];
  if (!Array.isArray(list)) throw new Error("marcas.json inválido: falta \"Marcas de Mercado\" (array)");

  const total = list.length;
  const errors = [];
  let processed = 0;
  const fila = [];

  for (let i = 0; i < total; i += 1) {
    const item = list[i];
    const nome = String(item?.nome || "").trim();
    const slug = slugify(nome);
    if (!slug) {
      errors.push({ index: i, nome, error: "slug inválido" });
      continue;
    }

    const brandDir = path.join(assetsAbs, slug);
    await ensureDir(brandDir);

    const configPath = path.join(brandDir, "config.json");
    await fs.writeFile(configPath, JSON.stringify(item, null, 2));
    fila.push({ processado: 0, path: path.resolve(configPath) });

    const imagem = String(item?.imagem || "").trim();
    if (imagem) {
      const ext = extFromUrl(imagem) || ".png";
      const logoPath = path.join(brandDir, `logo${ext}`);
      try {
        if (typeof log === "function") log(`marca ${i + 1} de ${total}: ${nome}`);
        await downloadToFile(imagem, logoPath);
      } catch (e) {
        errors.push({ index: i, nome, error: String(e?.message || e) });
        continue;
      }
    }

    processed += 1;
  }

  await fs.writeFile(filaAbs, JSON.stringify({ fila }, null, 2));
  return { total, processed, errors, filaPath };
}
