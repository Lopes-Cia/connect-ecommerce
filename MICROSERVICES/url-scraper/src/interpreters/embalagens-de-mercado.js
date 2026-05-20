import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { normalizeUrl } from "../config.js";
import { downloadToFile, ensureDir, extFromUrl, slugify } from "../file-utils.js";

function normalizeMaybeUrl(raw, baseUrl) {
  const val = String(raw || "").trim();
  if (!val) return "";
  try {
    return normalizeUrl(new URL(val, baseUrl).toString());
  } catch {
    return "";
  }
}

async function extractShowcase(page) {
  const showcaseSelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.showcase-panel.flexbox-container.flex-align-center.clearfix > div.showcase-body > div";
  const showcase = page.locator(showcaseSelector).first();
  const result = {};
  try {
    await showcase.waitFor({ state: "attached", timeout: 10000 });
    const items = await showcase.locator(".showcase-item-detail").all();
    for (const item of items) {
      const small = await item.locator("small").textContent();
      const h3 = await item.locator("h3").textContent();
      const key = small?.trim();
      const value = h3?.trim();
      if (key && value) {
        result[key] = value;
      }
    }
  } catch {
    // ignore showcase if not found
  }
  return result;
}

async function extractMidia(page, baseUrl) {
  const midiaSelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.packshelf-container.margin-top-20.margin-bottom-10 > section > div > div > div > div > div > a";
  const midia = page.locator(midiaSelector).first();
  let href = "";
  try {
    await midia.waitFor({ state: "attached", timeout: 5000 });
    href = await midia.getAttribute("href");
  } catch {
    // ignore midia if not found
  }
  return normalizeMaybeUrl(href, baseUrl);
}

async function extractEmbalagens(page, baseUrl, timeoutMs) {
  const containerSelector =
    "body > div.os-padding > div > div > div.master > div > div.container.clearfix > div.min-height-container > div.content.content-fluid > div.packshelf-container.margin-top-20.margin-bottom-10 > section > div > div > div > ul";
  const container = page.locator(containerSelector).first();
  await container.waitFor({ state: "attached", timeout: timeoutMs });

  const liHandles = await container.locator("li").all();
  const embalagens = [];

  for (let i = 0; i < liHandles.length; i += 1) {
    const li = liHandles[i];
    const modalLink = li.locator("a.sku-modal").first();
    const packageNameLink = li.locator("span.package-name a").first();
    const packageName = await packageNameLink.textContent();
    const nomeFromList = String(packageName || "").trim();

    if (!nomeFromList) continue;

    try {
      await modalLink.click();
      await page.waitForTimeout(500);

      const modalSelector = "#sku > div.modal-sku-hide > div";
      const modal = page.locator(modalSelector).first();
      await modal.waitFor({ state: "attached", timeout: timeoutMs });

      const hasContent = await modal.locator(".unitaria-img-sku-interno").first().isVisible().catch(() => false);
      if (!hasContent) {
        continue;
      }

      const modalTitleLocator = page.locator(".modal-sku-title h1 span").first();
      const modalTitle = await modalTitleLocator.textContent();
      const embalagemNome = String(modalTitle || nomeFromList).trim();

      const unitarias = await modal.locator(".unitaria-img-sku").evaluateAll((divs) => {
        return divs
          .map((div) => {
            const nomeLink = div.querySelector(".nome-sku-box p a.txt-regular");
            const imgLink = div.querySelector(".unitaria-btn-sku.btn-view a[data-title='Visualizar']");
            const nome = nomeLink?.textContent?.trim() || "";
            const href = imgLink?.getAttribute("href") || "";
            return { nome, imagem: href };
          })
          .filter((x) => x.nome || x.imagem);
      });

      const imagens = unitarias.map((u) => {
        let url = normalizeMaybeUrl(u.imagem, baseUrl);
        if (url) {
          try {
            const urlObj = new URL(url);
            urlObj.searchParams.delete("view");
            url = urlObj.toString();
          } catch {
            url = url.replace(/\?view=1(&|$)/, "$1").replace(/&view=1(&|$)/, "$1");
            if (url.endsWith("?")) url = url.slice(0, -1);
          }
        }
        return { nome: u.nome, imagem: url };
      });

      embalagens.push({ nome: embalagemNome, imagens });

      try {
        const closeBtn = page.locator(".jconfirm-closeIcon, .jconfirm-close, [class*='close']").first();
        await closeBtn.waitFor({ state: "attached", timeout: 3000 });
        await closeBtn.click();
      } catch {
        await page.mouse.click(5, 5);
      }

      await page.waitForTimeout(500);
    } catch {
      // ignore if modal fails
      continue;
    }
  }

  return embalagens;
}

export async function extractEmbalagensDeMercado({
  url,
  timeoutMs = 15000,
  headless = true,
  slowMo = 0,
  log = () => {}
}) {
  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  try {
    if (typeof log === "function") log(`embalagens: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    const showcase = await extractShowcase(page);
    const midia = await extractMidia(page, url);
    const embalagens = await extractEmbalagens(page, url, timeoutMs);

    const result = {
      "Embalagens de Mercado": {
        ...showcase,
        midia,
        Embalagens: embalagens
      }
    };

    return result;
  } finally {
    await browser.close().catch(() => {});
  }
}

export async function writeEmbalagensMercadoArtifacts({
  baseDir,
  embalagensData,
  log = () => {}
}) {
  const embalagensDir = path.join(baseDir, "Embalagens");
  await ensureDir(embalagensDir);

  const embalagens = embalagensData["Embalagens de Mercado"]?.Embalagens || [];

  for (let i = 0; i < embalagens.length; i += 1) {
    const emb = embalagens[i];
    const embSlug = slugify(emb?.nome);
    if (!embSlug) continue;

    const embDir = path.join(embalagensDir, embSlug);
    await ensureDir(embDir);

    const imagens = emb?.imagens || [];
    for (let j = 0; j < imagens.length; j += 1) {
      const img = imagens[j];
      const imgUrl = String(img?.imagem || "").trim();
      if (!imgUrl) continue;

      const ext = extFromUrl(imgUrl) || ".png";
      const imgName = slugify(img?.nome || `imagem-${j + 1}`);
      const imgPath = path.join(embDir, `${imgName}${ext}`);
      try {
        if (typeof log === "function")
          log(`embalagem ${i + 1} de ${embalagens.length}, imagem ${j + 1} de ${imagens.length}: ${img?.nome || ""}`);
        await downloadToFile(imgUrl, imgPath);
      } catch {
        continue;
      }
    }
  }

  const embalagensConfigPath = path.join(embalagensDir, "config.json");
  await fs.writeFile(embalagensConfigPath, JSON.stringify(embalagensData, null, 2));
}
