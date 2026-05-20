import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { normalizeUrl } from "./config.js";
import { downloadToFile, ensureDir, extFromUrl, slugify } from "./file-utils.js";

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

async function detectBrandPageType(page, timeoutMs) {
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

async function tryOpenEmbalagensTab(page, timeoutMs) {
  const tabs = page.locator("ul.tabs.clearfix a");
  if ((await tabs.count()) === 0) return false;
  const count = await tabs.count();
  for (let i = 0; i < count; i += 1) {
    const a = tabs.nth(i);
    const text = String((await a.textContent()) || "").trim().toLowerCase();
    if (text !== "embalagens de mercado") continue;
    await a.click({ timeout: timeoutMs });
    return true;
  }
  return false;
}

async function extractProdutosDeMercado(page, brandUrl, timeoutMs, brandDir, log) {
  const containerSelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div > section > div.listing > ul";
  const container = page.locator(containerSelector);
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
  const total = items.length;
  for (let i = 0; i < total; i += 1) {
    const it = items[i];
    const url = normalizeMaybeUrl(it.url, brandUrl);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    const imagem = normalizeMaybeUrl(it.imagem, brandUrl);
    const nome = String(it.nome || "").trim();
    const backgroundColor = extractBgColor("", it?.css?.backgroundColor);

    const produtoSlug = slugify(nome);
    if (produtoSlug) {
      const produtoDir = path.join(brandDir, "Produtos de Mercado", produtoSlug);
      await ensureDir(produtoDir);
      const ext = extFromUrl(imagem) || ".png";
      if (imagem) {
        if (typeof log === "function") log(`produto ${i + 1} de ${total}: ${nome}`);
        await downloadToFile(imagem, path.join(produtoDir, `logo${ext}`));
      }
    }

    normalized.push({
      nome,
      imagem,
      css: { backgroundColor },
      url
    });
  }

  return normalized;
}

async function extractShowcaseInfo(page, timeoutMs) {
  const selector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.showcase-panel.flexbox-container.flex-align-center.clearfix > div.showcase-body > div";
  const root = page.locator(selector);
  await root.waitFor({ state: "attached", timeout: timeoutMs });
  const info = await root.evaluate((el) => {
    const out = {};
    const blocks = el.querySelectorAll(".showcase-item-detail");
    for (const b of blocks) {
      const key = (b.querySelector("small")?.textContent || "").trim();
      const val = (b.querySelector("h3")?.textContent || "").trim();
      if (!key || !val) continue;
      out[key] = val;
    }
    return out;
  });
  return info && typeof info === "object" ? info : {};
}

async function extractMidiaUrl(page, brandUrl, timeoutMs) {
  const selector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.packshelf-container.margin-top-20.margin-bottom-10 > section > div > div > div > div > div > a";
  const a = page.locator(selector).first();
  await a.waitFor({ state: "attached", timeout: timeoutMs });
  const href = String((await a.getAttribute("href")) || "").trim();
  return normalizeMaybeUrl(href, brandUrl);
}

async function dismissBlockingDialogs(page, timeoutMs) {
  const jc = page.locator(".jconfirm.jconfirm-open").first();
  if (!(await jc.isVisible().catch(() => false))) return;
  const btn = jc.locator("button").first();
  if ((await btn.count()) > 0) {
    await btn.click({ timeout: timeoutMs }).catch(() => {});
  }
  await page.keyboard.press("Escape").catch(() => {});
  await jc.waitFor({ state: "hidden", timeout: Math.min(2000, timeoutMs) }).catch(() => {});
}

async function closeSkuModal(page, timeoutMs) {
  const modal = page.locator("div.modal-sku, #sku").first();
  if (!(await modal.isVisible().catch(() => false))) return;
  await page.keyboard.press("Escape").catch(() => {});
  await modal.waitFor({ state: "hidden", timeout: Math.min(timeoutMs, 5000) }).catch(() => {});
}

async function openSkuModal(page, trigger, timeoutMs) {
  await dismissBlockingDialogs(page, timeoutMs);
  await closeSkuModal(page, timeoutMs);

  await trigger.scrollIntoViewIfNeeded().catch(() => {});

  const modal = page.locator("div.modal-sku, #sku").first();
  const title = modal.locator(".modal-sku-title h1 span").first();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await trigger.click({ timeout: timeoutMs, force: true }).catch(() => {});
    await modal.waitFor({ state: "attached", timeout: timeoutMs }).catch(() => {});
    const ok = await title
      .waitFor({ state: "attached", timeout: Math.min(timeoutMs, 5000) })
      .then(() => true)
      .catch(() => false);
    if (ok) return modal;
    await dismissBlockingDialogs(page, timeoutMs);
  }

  await modal.waitFor({ state: "attached", timeout: timeoutMs });
  return modal;
}

async function extractEmbalagensFromModal(modal, page, timeoutMs, embalagemDir, embalagemIdx) {
  await modal.waitFor({ state: "attached", timeout: timeoutMs });

  const nome = String(
    (await modal.locator(".modal-sku-title h1 span").first().textContent()) || "",
  ).trim();

  const nodes = modal.locator(".unitaria-img-sku");
  const count = await nodes.count();
  const imagens = [];

  for (let i = 0; i < count; i += 1) {
    const n = nodes.nth(i);
    const imageName = String((await n.locator(".nome-sku-box a").first().textContent()) || "").trim();
    const href = String(
      (await n
        .locator('.unitaria-btn-sku.btn-view a[data-title="Visualizar"]')
        .first()
        .getAttribute("href")) || "",
    ).trim();

    if (!href) continue;
    const abs = normalizeMaybeUrl(href, await page.url());
    if (!abs) continue;
    imagens.push({ nome: imageName, imagem: abs });

    const assetSlug = slugify(imageName) || `asset-${embalagemIdx}-${i}`;
    const ext = extFromUrl(abs) || ".bin";
    const fileName = `${String(embalagemIdx).padStart(3, "0")}-${String(i).padStart(3, "0")}-${assetSlug}${ext}`;
    await downloadToFile(abs, path.join(embalagemDir, fileName));
  }

  return { nome, imagens };
}

async function extractEmbalagensDeMercado(page, brandUrl, timeoutMs, brandDir, produtoDir, log) {
  const info = await extractShowcaseInfo(page, timeoutMs);

  const midia = await extractMidiaUrl(page, brandUrl, timeoutMs);
  if (midia) {
    const outDir = produtoDir || brandDir;
    await ensureDir(outDir);
    const ext = extFromUrl(midia) || ".bin";
    await downloadToFile(midia, path.join(outDir, `midia${ext}`));
  }

  const listSelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.packshelf-container.margin-top-20.margin-bottom-10 > section > div > div > div > ul";
  const list = page.locator(listSelector).first();
  await list.waitFor({ state: "attached", timeout: timeoutMs });

  const links = list.locator("a.sku-modal[data-id-sku], a[data-id-sku]");
  const count = await links.count();

  const embalagens = [];
  for (let i = 0; i < count; i += 1) {
    const a = links.nth(i);
    try {
      if (typeof log === "function") log(`embalagem ${i + 1} de ${count}`);
      try {
        const modal = await openSkuModal(page, a, timeoutMs);
        const embalagemNome = String(
          (await modal.locator(".modal-sku-title h1 span").first().textContent()) || "",
        ).trim();
        const embalagemSlug = slugify(embalagemNome) || `embalagem-${i}`;
        const baseDir = produtoDir || brandDir;
        const embalagemDir = path.join(baseDir, "Embalagens", embalagemSlug);
        await ensureDir(embalagemDir);
        const data = await extractEmbalagensFromModal(modal, page, timeoutMs, embalagemDir, i);
        embalagens.push(data);
      } catch (e) {
        if (typeof log === "function") log(`embalagem ${i + 1} de ${count}: erro ao abrir/ler modal`);
      }
    } finally {
      await closeSkuModal(page, timeoutMs).catch(() => {});
    }
  }

  return {
    ...info,
    midia,
    Embalagens: embalagens
  };
}

export async function enrichHomeJson({
  homePath,
  index,
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  const abs = path.isAbsolute(homePath) ? homePath : path.resolve(process.cwd(), homePath);
  const payload = JSON.parse(await fs.readFile(abs, "utf8"));
  const list = payload?.["Marcas de Mercado"];
  if (!Array.isArray(list)) throw new Error("home.json inválido: falta \"Marcas de Mercado\" (array)");

  const indices =
    Number.isFinite(index) && index >= 0 ? [Number(index)] : list.map((_, i) => i);

  const baseAssetsDir = path.resolve(process.cwd(), "data/assets/files");

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  let fatalError;
  try {
    const totalBrands = indices.length;
    for (let pos = 0; pos < totalBrands; pos += 1) {
      const i = indices[pos];
      const item = list[i];
      if (!item?.url) continue;

      try {
        const brandUrl = normalizeUrl(item.url);
        if (!brandUrl) continue;

        const marcaSlug = slugify(item?.nome);
        if (!marcaSlug) continue;
        const brandDir = path.join(baseAssetsDir, marcaSlug);
        await ensureDir(brandDir);

        if (typeof log === "function") log(`marca ${pos + 1} de ${totalBrands}: ${item.nome}`);
        await page.goto(brandUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });

        const pageType = await detectBrandPageType(page, timeoutMs);
        item.pageType = pageType;

        if (pageType === "produtos-mercado") {
          const produtos = await extractProdutosDeMercado(page, brandUrl, timeoutMs, brandDir, log);
          item["Produtos de Mercado"] = produtos;

          for (const p of produtos) {
            if (!p?.url) continue;
            const produtoSlug = slugify(p?.nome);
            if (!produtoSlug) continue;
            const produtoDir = path.join(brandDir, "Produtos de Mercado", produtoSlug);
            await ensureDir(produtoDir);

            try {
              await page.goto(p.url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
              let productPageType = await detectBrandPageType(page, timeoutMs);
              if (productPageType !== "embalagens-mercado") {
                const clicked = await tryOpenEmbalagensTab(page, timeoutMs);
                if (clicked) {
                  productPageType = await detectBrandPageType(page, timeoutMs);
                }
              }
              if (productPageType === "embalagens-mercado") {
                const data = await extractEmbalagensDeMercado(
                  page,
                  p.url,
                  timeoutMs,
                  brandDir,
                  produtoDir,
                  log,
                );
                p["Embalagens de Mercado"] = data;
              }
            } catch {
              if (typeof log === "function") log(`produto: erro ao processar embalagens (${p.nome})`);
            }
          }
        }

        if (pageType === "embalagens-mercado") {
          const data = await extractEmbalagensDeMercado(
            page,
            brandUrl,
            timeoutMs,
            brandDir,
            undefined,
            log,
          );
          item["Embalagens de Mercado"] = data;
        }
      } catch {
        if (typeof log === "function") log(`marca: erro ao processar (${item.nome})`);
      }
    }
  } catch (e) {
    fatalError = e;
  } finally {
    await browser.close().catch(() => {});
    await fs.writeFile(abs, JSON.stringify(payload, null, 2));
  }

  if (fatalError) throw fatalError;
  return payload;
}

export async function processHomeIndexAtePasso4({
  homePath,
  index,
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  if (!Number.isFinite(index) || index < 0) throw new Error("index inválido");

  const abs = path.isAbsolute(homePath) ? homePath : path.resolve(process.cwd(), homePath);
  const payload = JSON.parse(await fs.readFile(abs, "utf8"));
  const list = payload?.["Marcas de Mercado"];
  if (!Array.isArray(list)) throw new Error("home.json inválido: falta \"Marcas de Mercado\" (array)");

  const item = list[index];
  if (!item) throw new Error(`item[${index}] não encontrado`);
  if (!item?.url) throw new Error(`item[${index}].url vazio`);

  const brandUrl = normalizeUrl(item.url);
  if (!brandUrl) throw new Error(`item[${index}].url inválida`);

  const marcaSlug = slugify(item?.nome);
  if (!marcaSlug) throw new Error(`item[${index}].nome inválido`);

  const baseAssetsDir = path.resolve(process.cwd(), "data/assets/files");
  const brandDir = path.join(baseAssetsDir, marcaSlug);
  await ensureDir(brandDir);

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  try {
    if (typeof log === "function") log(`marca: item[${index}] ${item.nome}`);
    await page.goto(brandUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    const pageType = await detectBrandPageType(page, timeoutMs);
    item.pageType = pageType;

    if (pageType === "produtos-mercado") {
      const produtos = await extractProdutosDeMercado(page, brandUrl, timeoutMs, brandDir, log);
      item["Produtos de Mercado"] = produtos;
    }
  } finally {
    await browser.close().catch(() => {});
    await fs.writeFile(abs, JSON.stringify(payload, null, 2));
  }

  return payload;
}

export async function processHomeIndexPasso5({
  homePath,
  index,
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  if (!Number.isFinite(index) || index < 0) throw new Error("index inválido");

  const abs = path.isAbsolute(homePath) ? homePath : path.resolve(process.cwd(), homePath);
  const payload = JSON.parse(await fs.readFile(abs, "utf8"));
  const list = payload?.["Marcas de Mercado"];
  if (!Array.isArray(list)) throw new Error("home.json inválido: falta \"Marcas de Mercado\" (array)");

  const item = list[index];
  if (!item) throw new Error(`item[${index}] não encontrado`);
  if (!item?.url) throw new Error(`item[${index}].url vazio`);

  const brandUrl = normalizeUrl(item.url);
  if (!brandUrl) throw new Error(`item[${index}].url inválida`);

  const marcaSlug = slugify(item?.nome);
  if (!marcaSlug) throw new Error(`item[${index}].nome inválido`);

  const baseAssetsDir = path.resolve(process.cwd(), "data/assets/files");
  const brandDir = path.join(baseAssetsDir, marcaSlug);
  await ensureDir(brandDir);

  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  try {
    if (typeof log === "function") log(`marca: item[${index}] ${item.nome}`);
    await page.goto(brandUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    let pageType = await detectBrandPageType(page, timeoutMs);
    if (pageType !== "embalagens-mercado") {
      const clicked = await tryOpenEmbalagensTab(page, timeoutMs).catch(() => false);
      if (clicked) {
        pageType = await detectBrandPageType(page, timeoutMs);
      }
    }
    item.pageType = pageType;

    if (pageType === "embalagens-mercado") {
      const data = await extractEmbalagensDeMercado(page, brandUrl, timeoutMs, brandDir, undefined, log);
      item["Embalagens de Mercado"] = data;
    }
  } finally {
    await browser.close().catch(() => {});
    await fs.writeFile(abs, JSON.stringify(payload, null, 2));
  }

  return payload;
}
