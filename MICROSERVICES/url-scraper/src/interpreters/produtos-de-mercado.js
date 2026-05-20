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

async function detectPageType(page, timeoutMs) {
  const selectorProdutos =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div > section > div.listing > ul";
  const selectorEmbalagens =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.packshelf-container.margin-top-20.margin-bottom-10 > section > div > div > div > ul";

  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs });

  const produtos = page.locator(selectorProdutos).first();
  if (await produtos.isVisible().catch(() => false)) return "produtos-mercado";

  const embalagens = page.locator(selectorEmbalagens).first();
  if (await embalagens.isVisible().catch(() => false)) return "embalagens-mercado";

  return "unknown";
}

async function extractProdutosFromPage(page, baseUrl, timeoutMs) {
  const containerSelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div > section > div.listing > ul";
  const container = page.locator(containerSelector).first();
  await container.waitFor({ state: "attached", timeout: timeoutMs });

  const items = await container.locator("li").evaluateAll((lis) =>
    lis
      .map((li) => {
        const box = li.querySelector("div.box-image");
        const productLink = li.querySelector("span.product-name a[href]");
        const img = li.querySelector("img.box-image-logo");

        const nome = (productLink?.textContent || "").trim();
        const href = (productLink?.getAttribute("href") || "").trim();
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
    const url = normalizeMaybeUrl(it.url, baseUrl);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    const imagem = normalizeMaybeUrl(it.imagem, baseUrl);
    const nome = String(it.nome || "").trim();
    const backgroundColor = extractBgColor("", it?.css?.backgroundColor);

    normalized.push({
      nome,
      imagem,
      css: { backgroundColor },
      url,
      processado: 0
    });
  }

  return normalized;
}

export async function processProdutosStage1({
  marcasPath = "data/output/marcas.json",
  produtosPath = "data/output/produtos.json",
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  const marcasAbs = path.isAbsolute(marcasPath) ? marcasPath : path.resolve(process.cwd(), marcasPath);
  const produtosAbs = path.isAbsolute(produtosPath) ? produtosPath : path.resolve(process.cwd(), produtosPath);

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  const marcasPayload = JSON.parse(await fs.readFile(marcasAbs, "utf8"));
  const marcas = marcasPayload?.["Marcas de Mercado"];
  if (!Array.isArray(marcas)) throw new Error("marcas.json inválido: falta \"Marcas de Mercado\" (array)");

  const indices = marcas.map((_, i) => i);

  const total = indices.length;
  const errors = [];
  let processed = 0;
  const out = [];

  try {
    for (let pos = 0; pos < total; pos += 1) {
      const i = indices[pos];
      const item = marcas[i];
      const url = String(item?.url || "").trim();
      if (!url) continue;

      try {
        if (typeof log === "function") log(`marca ${pos + 1} de ${total}: ${item?.nome || ""}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

        const pageType = await detectPageType(page, timeoutMs);
        const marcaSlug = slugify(item?.nome);

        if (pageType === "produtos-mercado") {
          const produtos = await extractProdutosFromPage(page, url, timeoutMs);
          out.push({
            marca: {
              nome: String(item?.nome || "").trim(),
              slug: marcaSlug,
              url
            },
            pageType,
            produtos
          });
          processed += 1;
          continue;
        }

        if (pageType === "embalagens-mercado") {
          out.push({
            marca: {
              nome: String(item?.nome || "").trim(),
              slug: marcaSlug,
              url
            },
            pageType,
            produtos: []
          });
          processed += 1;
          continue;
        }
      } catch (e) {
        errors.push({ index: i, nome: String(item?.nome || "").trim(), error: String(e?.message || e) });
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const payload = { "Produtos de Mercado": out };
  await fs.writeFile(produtosAbs, JSON.stringify(payload, null, 2));
  return { total, processed, errors, out: produtosPath };
}

export async function processProdutosStage2({
  produtosPath = "data/output/produtos.json",
  assetsDir = "data/assets/files"
}) {
  const produtosAbs = path.isAbsolute(produtosPath) ? produtosPath : path.resolve(process.cwd(), produtosPath);
  const assetsAbs = path.isAbsolute(assetsDir) ? assetsDir : path.resolve(process.cwd(), assetsDir);

  const payload = JSON.parse(await fs.readFile(produtosAbs, "utf8"));
  const list = payload?.["Produtos de Mercado"];
  if (!Array.isArray(list)) throw new Error("produtos.json inválido: falta \"Produtos de Mercado\" (array)");

  let processed = 0;
  const errors = [];

  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (String(entry?.pageType || "") !== "produtos-mercado") continue;

    const brandSlug = slugify(entry?.marca?.slug || entry?.marca?.nome);
    if (!brandSlug) {
      errors.push({ index: i, nome: String(entry?.marca?.nome || "").trim(), error: "slug inválido (marca)" });
      continue;
    }

    const baseDir = path.join(assetsAbs, brandSlug, "produtos-mercado");
    await ensureDir(baseDir);

    const produtos = entry?.produtos;
    if (!Array.isArray(produtos)) continue;

    for (let j = 0; j < produtos.length; j += 1) {
      const p = produtos[j];
      if (Number(p?.processado) >= 1) continue;
      const produtoSlug = slugify(p?.nome);
      if (!produtoSlug) {
        errors.push({
          index: i,
          produtoIndex: j,
          nome: String(entry?.marca?.nome || "").trim(),
          produto: String(p?.nome || "").trim(),
          error: "slug inválido (produto)"
        });
        continue;
      }

      await ensureDir(path.join(baseDir, produtoSlug));
      p.processado = 1;
      processed += 1;
    }
  }

  await fs.writeFile(produtosAbs, JSON.stringify(payload, null, 2));
  return { processed, errors };
}

export async function processProdutosStage3({
  produtosPath = "data/output/produtos.json",
  assetsDir = "data/assets/files",
  log = () => {}
}) {
  const produtosAbs = path.isAbsolute(produtosPath) ? produtosPath : path.resolve(process.cwd(), produtosPath);
  const assetsAbs = path.isAbsolute(assetsDir) ? assetsDir : path.resolve(process.cwd(), assetsDir);

  const payload = JSON.parse(await fs.readFile(produtosAbs, "utf8"));
  const list = payload?.["Produtos de Mercado"];
  if (!Array.isArray(list)) throw new Error("produtos.json inválido: falta \"Produtos de Mercado\" (array)");

  let processed = 0;
  const errors = [];

  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    if (String(entry?.pageType || "") !== "produtos-mercado") continue;

    const brandSlug = slugify(entry?.marca?.slug || entry?.marca?.nome);
    if (!brandSlug) continue;

    const baseDir = path.join(assetsAbs, brandSlug, "produtos-mercado");
    const produtos = entry?.produtos;
    if (!Array.isArray(produtos)) continue;

    for (let j = 0; j < produtos.length; j += 1) {
      const p = produtos[j];
      if (Number(p?.processado) >= 2) continue;
      if (Number(p?.processado) !== 1) continue;

      const produtoSlug = slugify(p?.nome);
      if (!produtoSlug) continue;

      const produtoDir = path.join(baseDir, produtoSlug);
      await ensureDir(produtoDir);

      await fs.writeFile(path.join(produtoDir, "config.json"), JSON.stringify(p, null, 2));

      const imagem = String(p?.imagem || "").trim();
      if (imagem) {
        const ext = extFromUrl(imagem) || ".png";
        const logoPath = path.join(produtoDir, `logo${ext}`);
        try {
          if (typeof log === "function")
            log(`produto ${j + 1} (${String(entry?.marca?.nome || "").trim()}): ${String(p?.nome || "").trim()}`);
          await downloadToFile(imagem, logoPath);
        } catch (e) {
          errors.push({
            index: i,
            produtoIndex: j,
            nome: String(entry?.marca?.nome || "").trim(),
            produto: String(p?.nome || "").trim(),
            error: String(e?.message || e)
          });
          continue;
        }
      }

      p.processado = 2;
      processed += 1;
    }
  }

  await fs.writeFile(produtosAbs, JSON.stringify(payload, null, 2));
  return { processed, errors };
}
