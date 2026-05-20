import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { normalizeUrl } from "../config.js";
import { downloadToFile, ensureDir, extFromUrl, slugify } from "../file-utils.js";
import { extractEmbalagensDeMercado, writeEmbalagensMercadoArtifacts } from "../interpreters/embalagens-de-mercado.js";

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
          const m = raw.match(/background-color\\s*:\\s*([^;]+)/i);
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

    normalized.push({
      nome: String(it.nome || "").trim(),
      imagem: normalizeMaybeUrl(it.imagem, baseUrl),
      css: { backgroundColor: String(it?.css?.backgroundColor || "").trim() },
      url,
      processado: 0
    });
  }

  return normalized;
}

async function writeProdutosMercadoArtifacts({ brandDir, marcaNome, marcaUrl, produtos, log }) {
  const produtosDir = path.join(brandDir, "produtos-mercado");
  await ensureDir(produtosDir);

  const marcaSlug = slugify(marcaNome);
  const payload = {
    "Produtos de Mercado": [
      {
        marca: { nome: marcaNome, slug: marcaSlug, url: marcaUrl },
        pageType: "produtos-mercado",
        produtos
      }
    ]
  };

  await fs.writeFile(path.join(produtosDir, "config.json"), JSON.stringify(payload, null, 2));

  const produtoConfigPaths = [];

  for (let i = 0; i < produtos.length; i += 1) {
    const p = produtos[i];
    const produtoSlug = slugify(p?.nome);
    if (!produtoSlug) continue;

    const pDir = path.join(produtosDir, produtoSlug);
    await ensureDir(pDir);

    const pConfig = path.join(pDir, "config.json");
    await fs.writeFile(pConfig, JSON.stringify(p, null, 2));
    produtoConfigPaths.push(path.resolve(pConfig));

    const img = String(p?.imagem || "").trim();
    if (img) {
      const ext = extFromUrl(img) || ".png";
      try {
        if (typeof log === "function") log(`produto ${i + 1} de ${produtos.length}: ${p?.nome || ""}`);
        await downloadToFile(img, path.join(pDir, `logo${ext}`));
      } catch {
        continue;
      }
    }
  }

  return { produtoConfigPaths };
}

async function saveFila(filaAbs, fila) {
  await fs.writeFile(filaAbs, JSON.stringify({ fila }, null, 2));
}

export async function processFila({
  filaPath = "data/output/fila.json",
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  const filaAbs = path.isAbsolute(filaPath) ? filaPath : path.resolve(process.cwd(), filaPath);
  const filaPayload = JSON.parse(await fs.readFile(filaAbs, "utf8"));
  const fila = filaPayload?.fila;
  if (!Array.isArray(fila)) throw new Error("fila.json inválido: falta \"fila\" (array)");

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  let processed = 0;
  const existing = new Set(fila.map((x) => String(x?.path || "").trim()).filter(Boolean));

  try {
    let i = 0;
    while (i < fila.length) {
      const job = fila[i];
      if (Number(job?.processado) === 1) {
        i += 1;
        continue;
      }

      const configPath = String(job?.path || "").trim();
      if (!configPath) {
        i += 1;
        continue;
      }

      let cfg;
      try {
        cfg = JSON.parse(await fs.readFile(configPath, "utf8"));
      } catch {
        i += 1;
        continue;
      }

      const url = String(cfg?.url || "").trim();
      if (!url) {
        i += 1;
        continue;
      }

      const brandDir = path.dirname(configPath);
      const marcaNome = String(cfg?.nome || "").trim();
      const marcaUrl = normalizeMaybeUrl(url, url);

      try {
        const total = fila.length;
        if (typeof log === "function") log(`fila ${i + 1} de ${total}: ${marcaNome}`);
        await page.goto(marcaUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        const pageType = await detectPageType(page, timeoutMs);

        if (pageType === "produtos-mercado") {
          const produtos = await extractProdutosFromPage(page, marcaUrl, timeoutMs);
          const { produtoConfigPaths } = await writeProdutosMercadoArtifacts({
            brandDir,
            marcaNome,
            marcaUrl,
            produtos,
            log
          });
          job.processado = 1;
          job.tipo = "produtos-mercado";
          for (const p of produtoConfigPaths) {
            if (!p) continue;
            if (existing.has(p)) continue;
            existing.add(p);
            fila.push({ processado: 0, path: p });
          }
          processed += 1;
          await saveFila(filaAbs, fila);
          i += 1;
          continue;
        }

        if (pageType === "embalagens-mercado") {
          const embalagensData = await extractEmbalagensDeMercado({
            url: marcaUrl,
            timeoutMs,
            headless,
            slowMo,
            log
          });
          await writeEmbalagensMercadoArtifacts({
            baseDir: brandDir,
            embalagensData,
            log
          });
          job.processado = 1;
          job.tipo = "embalagens-mercado";
          processed += 1;
          await saveFila(filaAbs, fila);
          i += 1;
          continue;
        }

        job.tipo = "unknown";
        await saveFila(filaAbs, fila);
      } catch {
        job.erro = "falha ao processar url";
        await saveFila(filaAbs, fila);
      }
      i += 1;
    }
  } finally {
    await browser.close().catch(() => {});
    await saveFila(filaAbs, fila);
  }

  return { total: fila.length, processed, filaPath };
}
