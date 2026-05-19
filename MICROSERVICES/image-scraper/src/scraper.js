import { PlaywrightCrawler, log } from 'crawlee';
import sizeOf from 'image-size';
import { generateShortHash } from './mockend-client.js';
import { analyzeProductImage } from './visual-filter.js';

log.setLevel(log.LEVELS.INFO);

const PACK_REGEX = /(pack|combo|kit|caixa|fardo|6x|8x|10x|12x|24x|multipack|sortido|c\/\d+|com\s+\d+\s*(un|unidades|garrafas|latas)|\d+\s*(un|unidades|garrafas|latas))/i;
const WHITE_BG_HINT_REGEX = /(fundo\s*branco|isolad[ao]|white\s*background|background\s*white|ecommerce|catalogo|catalog)/i;
const TRUSTED_SOURCE_REGEX = /(vtex|supermercado|carrefour|atacadao|paguemenos|paodeacucar|imigrantes|vinho|adega|bebidas|mercafacil|catalog|ecommerce)/i;
const LOW_QUALITY_SOURCE_REGEX = /(freepik|dreamstime|shutterstock|depositphotos|alamy|istock|pinterest|wikimedia)/i;
const TARGET_TYPES = new Set(["produto", "categoria", "marca", "banner"]);

function hasPackHint(text) {
  return PACK_REGEX.test(String(text || "").toLowerCase());
}

function hasWhiteBgHint(text) {
  return WHITE_BG_HINT_REGEX.test(String(text || "").toLowerCase());
}

async function passesProfileCheck({ buffer, hint, aspectRatio, profile }) {
  if (profile.requireWhiteBgHint && !hasWhiteBgHint(hint)) return false;
  if (aspectRatio < profile.minAspectRatio || aspectRatio > profile.maxAspectRatio) return false;

  if (!profile.useVisualFilter) return true;
  const visual = await analyzeProductImage(buffer, {
    whiteThreshold: profile.visualWhiteThreshold,
    minWhiteRatio: profile.visualMinWhiteRatio,
    maxObjectCoverage: profile.visualMaxObjectCoverage,
    minObjectCoverage: profile.visualMinObjectCoverage,
    maxComponents: profile.visualMaxComponents,
  });
  return visual.ok;
}

function buildSearchQueries(baseQuery, retryNotFound, targetType) {
  if (targetType === "categoria") {
    const q1 = `${baseQuery} categoria ecommerce foto`;
    if (!retryNotFound) return [q1];
    return [q1, `${baseQuery} prateleira mercado categoria`, `${baseQuery} banner categoria loja`];
  }
  if (targetType === "marca") {
    const q1 = `${baseQuery} logo oficial png transparente`;
    if (!retryNotFound) return [q1];
    return [q1, `${baseQuery} brand logo svg`, `${baseQuery} logomarca vetorial`];
  }
  if (targetType === "banner") {
    const q1 = `${baseQuery} banner promocional ecommerce`;
    if (!retryNotFound) return [q1];
    return [q1, `${baseQuery} hero banner horizontal`, `${baseQuery} campanha digital banner`];
  }

  const q1 = `${baseQuery} produto unitario fundo branco ecommerce -pack -kit -combo -caixa -fardo -6x -12x`;
  if (!retryNotFound) return [q1];
  return [q1, `${baseQuery} garrafa unidade fundo branco ecommerce -pack -kit -combo`, `${baseQuery} lata unidade fundo branco ecommerce -pack -kit -combo`, `${baseQuery} png fundo branco produto`];
}

function scoreCandidateSource({ url, hint, provider }) {
  const text = `${hint || ""} ${url || ""}`.toLowerCase();
  if (hasPackHint(text)) return -100;

  let score = 0;
  if (hasWhiteBgHint(text)) score += 3;
  if (TRUSTED_SOURCE_REGEX.test(text)) score += 4;
  if (LOW_QUALITY_SOURCE_REGEX.test(text)) score -= 3;
  if (provider === "ddg-api") score += 1;
  return score;
}

function mergeCandidates(current, incoming, maxPoolSize) {
  const map = new Map(current.map((c) => [c.url, c]));
  for (const cand of incoming) {
    if (!cand?.url) continue;
    const existing = map.get(cand.url);
    if (!existing || (cand.score ?? 0) > (existing.score ?? 0)) {
      map.set(cand.url, cand);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, maxPoolSize);
}

function resolveTargetType(value) {
  const normalized = String(value || "produto").trim().toLowerCase();
  return TARGET_TYPES.has(normalized) ? normalized : "produto";
}

function getTargetProfile(targetType) {
  if (targetType === "categoria") {
    return { imageField: "image", assetFolder: "categorias", shouldBlockPack: false, fallbackName: "Categoria", fallbackBrand: "Categoria" };
  }
  if (targetType === "marca") {
    return { imageField: "logo", assetFolder: "marcas", shouldBlockPack: false, fallbackName: "Marca", fallbackBrand: "Marca" };
  }
  if (targetType === "banner") {
    return { imageField: "image", assetFolder: "banners", shouldBlockPack: false, fallbackName: "Banner", fallbackBrand: "Banner" };
  }
  return { imageField: "image", assetFolder: "produtos", shouldBlockPack: true, fallbackName: "Produto", fallbackBrand: "Produto" };
}

async function providerDuckDuckGoApi({ query, ua }) {
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const initRes = await fetch(initUrl, { headers: { "user-agent": ua } });
  if (!initRes.ok) return [];
  const initHtml = await initRes.text();
  const vqdMatch =
    initHtml.match(/vqd='([^']+)'/) ??
    initHtml.match(/vqd="([^"]+)"/) ??
    initHtml.match(/vqd=([^&\s"]+)/);
  const vqd = vqdMatch?.[1] ? String(vqdMatch[1]).trim() : "";
  if (!vqd) return [];

  const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}`;
  const apiRes = await fetch(apiUrl, {
    headers: { "user-agent": ua, accept: "application/json" },
  });
  if (!apiRes.ok) return [];

  const apiData = await apiRes.json().catch(() => null);
  const results = Array.isArray(apiData?.results) ? apiData.results : [];
  return results
    .map((r) => {
      const url = r?.image || "";
      const hint = `${r?.title || ""} ${r?.url || ""} ${r?.source || ""}`.trim();
      return {
        url,
        hint,
        provider: "ddg-api",
        query,
        score: scoreCandidateSource({ url, hint, provider: "ddg-api" }),
      };
    })
    .filter((r) => Boolean(r.url));
}

async function providerDuckDuckGoPage({ query, page }) {
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  await page.goto(initUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector("img", { timeout: 15000 });

  const candidatesRaw = await page.$$eval("img", (imgs) =>
    imgs
      .map((img) => img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-original") || "")
      .filter(Boolean)
  );

  return [...new Set(candidatesRaw)]
    .map((u) => (u.startsWith("//") ? `https:${u}` : u))
    .filter((u) => u.startsWith("http"))
    .filter((u) => !u.startsWith("data:"))
    .filter((u) => !u.includes("/ip3/"))
    .filter((u) => !u.includes("/dist/react-assets/"))
    .filter((u) => !u.toLowerCase().endsWith(".ico"))
    .map((url) => ({
      url,
      hint: url,
      provider: "ddg-page",
      query,
      score: scoreCandidateSource({ url, hint: url, provider: "ddg-page" }),
    }));
}

export class ImageScraper {
  constructor(jsonClient, options = {}) {
    this.client = jsonClient;
    this.targetType = resolveTargetType(options.targetType);
    this.targetProfile = getTargetProfile(this.targetType);
    this.safeMode = options.safe !== false; // Default true
    this.retryNotFound = options.retryNotFound === true;
    this.maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || '2', 10);
    this.emit = typeof options.emit === "function" ? options.emit : null;
    this.minBytes = parseInt(process.env.MIN_IMAGE_BYTES || '10000', 10);
    this.minAspectRatio = parseFloat(process.env.MIN_IMAGE_ASPECT_RATIO || "0.35");
    this.maxAspectRatio = parseFloat(process.env.MAX_IMAGE_ASPECT_RATIO || "1.35");
    this.requireWhiteBgHint = String(process.env.REQUIRE_WHITE_BG_HINT || "1") !== "0";
    this.useVisualFilter = String(process.env.USE_VISUAL_FILTER || "1") !== "0";
    this.visualMinWhiteRatio = parseFloat(process.env.VISUAL_MIN_WHITE_RATIO || "0.60");
    this.visualWhiteThreshold = parseInt(process.env.VISUAL_WHITE_THRESHOLD || "238", 10);
    this.visualMaxObjectCoverage = parseFloat(process.env.VISUAL_MAX_OBJECT_COVERAGE || "0.58");
    this.visualMinObjectCoverage = parseFloat(process.env.VISUAL_MIN_OBJECT_COVERAGE || "0.03");
    this.visualMaxComponents = parseInt(process.env.VISUAL_MAX_COMPONENTS || "2", 10);
    this.enableRelaxedRetryProfile = String(process.env.ENABLE_RELAXED_RETRY_PROFILE || "1") !== "0";
    this.relaxedMinAspectRatio = parseFloat(process.env.RELAXED_MIN_IMAGE_ASPECT_RATIO || "0.30");
    this.relaxedMaxAspectRatio = parseFloat(process.env.RELAXED_MAX_IMAGE_ASPECT_RATIO || "1.60");
    this.relaxedRequireWhiteBgHint = String(process.env.RELAXED_REQUIRE_WHITE_BG_HINT || "0") !== "0";
    this.relaxedUseVisualFilter = String(process.env.RELAXED_USE_VISUAL_FILTER || "1") !== "0";
    this.relaxedVisualMinWhiteRatio = parseFloat(process.env.RELAXED_VISUAL_MIN_WHITE_RATIO || "0.50");
    this.relaxedVisualWhiteThreshold = parseInt(process.env.RELAXED_VISUAL_WHITE_THRESHOLD || "232", 10);
    this.relaxedVisualMaxObjectCoverage = parseFloat(process.env.RELAXED_VISUAL_MAX_OBJECT_COVERAGE || "0.68");
    this.relaxedVisualMinObjectCoverage = parseFloat(process.env.RELAXED_VISUAL_MIN_OBJECT_COVERAGE || "0.02");
    this.relaxedVisualMaxComponents = parseInt(process.env.RELAXED_VISUAL_MAX_COMPONENTS || "3", 10);
    this.maxCollectedCandidates = parseInt(process.env.CANDIDATE_POOL_SIZE || "120", 10);
    this.maxCandidateEvaluations = parseInt(process.env.CANDIDATE_EVAL_LIMIT || "40", 10);
    this.placeholderOnNotFound = String(process.env.PLACEHOLDER_ON_NOT_FOUND || "1") !== "0";
    this.placeholderImageUrl = String(process.env.PLACEHOLDER_IMAGE_URL || "/assets/images/semImagem.png");
  }

  async run() {
    log.info(`Iniciando Scraper. targetType=${this.targetType}. Modo Seguro: ${this.safeMode}`);
    if (this.emit) {
      await this.emit("run.start", { safe: this.safeMode, maxConcurrency: this.maxConcurrency });
    }
    
    // 1. Carregar Catálogo
    const produtos = await this.client.getCatalog('produtos');
    let metaData = await this.client.getMeta();
    const imageField = this.targetProfile.imageField;
    const metaKeyFor = (id) => `${this.targetType}:${id}`;
    const getMetaEntry = (id) => metaData?.[metaKeyFor(id)] ?? metaData?.[id] ?? null;
    const isBadMetaSource = (id) => {
      const src = String(getMetaEntry(id)?.sourceUrl || "");
      const lower = src.toLowerCase();
      return lower.includes("/ip3/") || lower.includes("/dist/react-assets/") || lower.endsWith(".ico");
    };
    let targetProdutos = produtos.filter((p) => {
      const currentImage = String(p?.[imageField] || "");
      return !currentImage || currentImage.includes('placeholder') || isBadMetaSource(p.id) || currentImage.toLowerCase().endsWith(".gif");
    });
    if (this.retryNotFound) {
      const queue = await this.client.getNotFound();
      const queuedIds = new Set(
        queue
          .filter((r) => (r?.targetType || "produto") === this.targetType)
          .map((r) => r?.id)
          .filter((id) => id !== undefined && id !== null),
      );
      targetProdutos = produtos.filter((p) => queuedIds.has(p.id));
      log.info(`Modo retry-not-found: ${targetProdutos.length} produtos da fila.`);
    }
    if (this.emit) {
      await this.emit("catalog.loaded", {
        totalProdutos: produtos.length,
        semImagem: targetProdutos.length,
      });
    }

    if (this.safeMode) {
      const sampleSize = Math.max(1, Math.floor(targetProdutos.length * 0.1));
      log.info(`Modo Seguro: Amostrando ${sampleSize} de ${targetProdutos.length} produtos sem imagem.`);
      targetProdutos = targetProdutos.slice(0, sampleSize);
    } else {
      log.info(`Modo Completo: Processando ${targetProdutos.length} produtos sem imagem.`);
    }

    if (targetProdutos.length === 0) {
      log.info('Nenhum produto precisando de imagem.');
      if (this.emit) await this.emit("run.noop", {});
      return;
    }
    let updatedProdutos = [...produtos]; // Cópia
    let changes = 0;
    const notFoundRows = [];

    const cfg = {
      client: this.client,
      emit: this.emit,
      targetType: this.targetType,
      targetProfile: this.targetProfile,
      retryNotFound: this.retryNotFound,
      enableRelaxedRetryProfile: this.enableRelaxedRetryProfile,
      maxCollectedCandidates: this.maxCollectedCandidates,
      maxCandidateEvaluations: this.maxCandidateEvaluations,
      minBytes: this.minBytes,
      requireWhiteBgHint: this.requireWhiteBgHint,
      minAspectRatio: this.minAspectRatio,
      maxAspectRatio: this.maxAspectRatio,
      useVisualFilter: this.useVisualFilter,
      visualMinWhiteRatio: this.visualMinWhiteRatio,
      visualWhiteThreshold: this.visualWhiteThreshold,
      visualMaxObjectCoverage: this.visualMaxObjectCoverage,
      visualMinObjectCoverage: this.visualMinObjectCoverage,
      visualMaxComponents: this.visualMaxComponents,
      relaxedRequireWhiteBgHint: this.relaxedRequireWhiteBgHint,
      relaxedMinAspectRatio: this.relaxedMinAspectRatio,
      relaxedMaxAspectRatio: this.relaxedMaxAspectRatio,
      relaxedUseVisualFilter: this.relaxedUseVisualFilter,
      relaxedVisualMinWhiteRatio: this.relaxedVisualMinWhiteRatio,
      relaxedVisualWhiteThreshold: this.relaxedVisualWhiteThreshold,
      relaxedVisualMaxObjectCoverage: this.relaxedVisualMaxObjectCoverage,
      relaxedVisualMinObjectCoverage: this.relaxedVisualMinObjectCoverage,
      relaxedVisualMaxComponents: this.relaxedVisualMaxComponents,
      placeholderOnNotFound: this.placeholderOnNotFound,
      placeholderImageUrl: this.placeholderImageUrl,
    };
    const strictProfile = {
      name: "strict",
      requireWhiteBgHint: cfg.requireWhiteBgHint,
      minAspectRatio: cfg.minAspectRatio,
      maxAspectRatio: cfg.maxAspectRatio,
      useVisualFilter: cfg.useVisualFilter,
      visualMinWhiteRatio: cfg.visualMinWhiteRatio,
      visualWhiteThreshold: cfg.visualWhiteThreshold,
      visualMaxObjectCoverage: cfg.visualMaxObjectCoverage,
      visualMinObjectCoverage: cfg.visualMinObjectCoverage,
      visualMaxComponents: cfg.visualMaxComponents,
    };
    if (cfg.targetType === "categoria") {
      strictProfile.requireWhiteBgHint = false;
      strictProfile.maxAspectRatio = Math.max(strictProfile.maxAspectRatio, 2.2);
    } else if (cfg.targetType === "marca") {
      strictProfile.requireWhiteBgHint = false;
      strictProfile.minAspectRatio = 0.2;
      strictProfile.maxAspectRatio = 5.0;
      strictProfile.visualMaxComponents = Math.max(4, strictProfile.visualMaxComponents);
    } else if (cfg.targetType === "banner") {
      strictProfile.requireWhiteBgHint = false;
      strictProfile.minAspectRatio = 1.2;
      strictProfile.maxAspectRatio = 8.0;
      strictProfile.visualMaxComponents = Math.max(6, strictProfile.visualMaxComponents);
      strictProfile.visualMaxObjectCoverage = Math.max(0.85, strictProfile.visualMaxObjectCoverage);
    }
    const relaxedProfile = {
      name: "relaxed",
      requireWhiteBgHint: cfg.relaxedRequireWhiteBgHint,
      minAspectRatio: cfg.relaxedMinAspectRatio,
      maxAspectRatio: cfg.relaxedMaxAspectRatio,
      useVisualFilter: cfg.relaxedUseVisualFilter,
      visualMinWhiteRatio: cfg.relaxedVisualMinWhiteRatio,
      visualWhiteThreshold: cfg.relaxedVisualWhiteThreshold,
      visualMaxObjectCoverage: cfg.relaxedVisualMaxObjectCoverage,
      visualMinObjectCoverage: cfg.relaxedVisualMinObjectCoverage,
      visualMaxComponents: cfg.relaxedVisualMaxComponents,
    };
    if (cfg.targetType === "categoria") {
      relaxedProfile.requireWhiteBgHint = false;
      relaxedProfile.maxAspectRatio = Math.max(relaxedProfile.maxAspectRatio, 2.6);
    } else if (cfg.targetType === "marca") {
      relaxedProfile.requireWhiteBgHint = false;
      relaxedProfile.minAspectRatio = 0.15;
      relaxedProfile.maxAspectRatio = 6.0;
      relaxedProfile.visualMaxComponents = Math.max(6, relaxedProfile.visualMaxComponents);
    } else if (cfg.targetType === "banner") {
      relaxedProfile.requireWhiteBgHint = false;
      relaxedProfile.minAspectRatio = 1.0;
      relaxedProfile.maxAspectRatio = 10.0;
      relaxedProfile.visualMaxComponents = Math.max(8, relaxedProfile.visualMaxComponents);
      relaxedProfile.visualMaxObjectCoverage = Math.max(0.95, relaxedProfile.visualMaxObjectCoverage);
    }
    const candidateProfiles =
      cfg.retryNotFound && cfg.enableRelaxedRetryProfile ? [strictProfile, relaxedProfile] : [strictProfile];
    if (cfg.retryNotFound && cfg.enableRelaxedRetryProfile) {
      log.info("Retry com perfil relaxado habilitado (fallback após validação estrita).");
    }

    // 2. Configurar o Crawler
    const crawler = new PlaywrightCrawler({
      maxConcurrency: this.maxConcurrency,
      maxRequestRetries: 2,
      headless: true,
      requestHandlerTimeoutSecs: 30,
      
      async requestHandler({ request, page, log }) {
        const { id, title, query, slug } = request.userData;
        log.info(`Buscando imagem para: ${title} (${query})`);
        if (cfg.emit) {
          await cfg.emit("produto.start", { produtoId: id, title, query, slug });
        }

        try {
          const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
          const searchQueries = buildSearchQueries(query, cfg.retryNotFound, cfg.targetType);
          const providers = [
            (ctx) => providerDuckDuckGoApi(ctx),
            (ctx) => providerDuckDuckGoPage(ctx),
          ];
          let candidates = [];

          for (const queryText of searchQueries) {
            for (const provider of providers) {
              const found = await provider({ query: queryText, ua, page }).catch(() => []);
              candidates = mergeCandidates(candidates, found, cfg.maxCollectedCandidates);
            }
            if (candidates.length >= cfg.maxCollectedCandidates) break;
          }

          if (candidates.length === 0) {
            log.warning(`Nenhuma imagem candidata encontrada para ${title}`);
            if (cfg.emit) {
              await cfg.emit("produto.not_found", { produtoId: id, title, query });
            }
            return;
          }
          log.info(`Candidatos coletados: ${candidates.length}`);

          let imageUrl = null;
          let buffer = null;
          let contentType = "";

          for (const cand of candidates.slice(0, cfg.maxCandidateEvaluations)) {
            try {
              const candUrl = String(cand?.url || "");
              const hint = `${cand?.hint || ""} ${candUrl}`;
              if (!candUrl) continue;
              if (cfg.targetProfile.shouldBlockPack && hasPackHint(hint)) continue;

              const response = await fetch(candUrl);
              if (!response.ok) continue;
              contentType = response.headers.get("content-type") || "";
              if (!contentType.toLowerCase().startsWith("image/")) continue;
              if (contentType.toLowerCase().includes("icon")) continue;
              if (contentType.toLowerCase().includes("gif")) continue;
              if (candUrl.includes("/dist/react-assets/")) continue;

              const arrayBuffer = await response.arrayBuffer();
              const b = Buffer.from(arrayBuffer);
              if (b.length < cfg.minBytes) continue;

              // Validar dimensões e formato com image-size
              let dimensions;
              try {
                dimensions = sizeOf(b);
              } catch {
                continue;
              }

              // Rejeitar gifs animados, ícones ou imagens menores que 300x300
              if (!dimensions || dimensions.type === "gif" || dimensions.type === "ico") continue;
              if (dimensions.width < 300 || dimensions.height < 300) continue;
              const aspectRatio = dimensions.width / dimensions.height;

              let accepted = false;
              for (const profile of candidateProfiles) {
                const ok = await passesProfileCheck({
                  buffer: b,
                  hint,
                  aspectRatio,
                  profile,
                });
                if (ok) {
                  accepted = true;
                  break;
                }
              }
              if (!accepted) continue;

              imageUrl = candUrl;
              buffer = b;
              break;
            } catch {
              continue;
            }
          }

          if (!imageUrl || !buffer) {
            log.warning(`Nenhuma imagem válida encontrada para ${title}`);
            notFoundRows.push({
              id,
              targetType: cfg.targetType,
              slug,
              title,
              query,
              reason: "no_valid_image",
              ts: new Date().toISOString(),
            });

            if (cfg.placeholderOnNotFound) {
              const prodIndex = updatedProdutos.findIndex((p) => p.id === id);
              if (prodIndex >= 0) {
                updatedProdutos[prodIndex][imageField] = cfg.placeholderImageUrl;
                changes++;
              }
            }

            if (cfg.emit) {
              await cfg.emit("produto.not_found", { produtoId: id, title, query });
            }
            return;
          }


          log.info(`Encontrada URL: ${imageUrl}`);
          if (cfg.emit) {
            await cfg.emit("produto.image_found", { produtoId: id, title, imageUrl, contentType, bytes: buffer.length });
          }

          // Salvar asset local em /data/assets/images
          const shortHash = generateShortHash(imageUrl);
          const ct = (contentType || "").toLowerCase();
          const ext =
            ct.includes("image/webp") ? ".webp" :
            ct.includes("image/png") ? ".png" :
            ct.includes("image/jpeg") ? ".jpg" :
            ct.includes("image/jpg") ? ".jpg" :
            ct.includes("image/gif") ? ".gif" :
            ct.includes("image/svg") ? ".svg" :
            ".jpg";
          const fileName = `${cfg.targetProfile.assetFolder}/${slug}-${shortHash}${ext}`;
          
          const relativePath = await cfg.client.uploadAsset(fileName, buffer);
          log.info(`Imagem salva localmente em: ${relativePath}`);
          if (cfg.emit) {
            await cfg.emit("produto.asset_uploaded", {
              produtoId: id,
              title,
              imageUrl,
              relativePath,
              bytes: buffer.length,
              contentType,
            });
          }

          // Atualizar metadados locais em memória
          metaData[metaKeyFor(id)] = {
            sourceUrl: imageUrl,
            method: 'B (Playwright DuckDuckGo Images)',
            ts: new Date().toISOString(),
            hash: shortHash,
            bytes: buffer.length,
            contentType,
          };

          // Atualizar produto na lista em memória
          const prodIndex = updatedProdutos.findIndex(p => p.id === id);
          if (prodIndex > -1) {
            updatedProdutos[prodIndex][imageField] = relativePath;
            changes++;
            if (cfg.emit) {
              await cfg.emit("produto.updated", { produtoId: id, title, image: relativePath, changes });
            }
          }

        } catch (error) {
          log.error(`Erro ao processar ${title}: ${error.message}`);
          notFoundRows.push({
            id,
            targetType: cfg.targetType,
            slug,
            title,
            query,
            reason: "request_error",
            message: error?.message || String(error),
            ts: new Date().toISOString(),
          });
          if (cfg.emit) {
            await cfg.emit("produto.error", { produtoId: id, title, message: error?.message || String(error) });
          }
        }
      },
      
      failedRequestHandler({ request, log }) {
        log.error(`Request falhou permanentemente para ${request.userData.title}`);
      }
    });

    // 3. Alimentar a fila
    const requests = targetProdutos.map(p => {
      const itemName =
        p?.name ||
        p?.title ||
        p?.label ||
        p?.slug ||
        `${cfg.targetProfile.fallbackName} ${p?.id ?? ""}`.trim();
      const itemBrand =
        p?.brand ||
        p?.marca ||
        p?.name ||
        cfg.targetProfile.fallbackBrand;
      return ({
      url: 'https://example.com/dummy', // Crawlee exige URL inicial válida
      uniqueKey: String(p.id),
      userData: {
        id: p.id,
        slug: p.slug || p.id,
        title: itemName,
        query: `${itemName} ${itemBrand || ''}`.trim()
      }
    })});

    await crawler.addRequests(requests);
    
    // Rodar crawler
    await crawler.run();

    // 4. Salvar tudo em JSON local
    await this.client.updateNotFound(notFoundRows);
    log.info(`Fila de não encontrados atualizada: ${notFoundRows.length} itens.`);

    if (changes > 0) {
      log.info(`Salvando JSONs: ${changes} produtos atualizados.`);
      await this.client.updateJson('produtos', updatedProdutos);
      await this.client.updateMeta(metaData);
      log.info('Arquivos locais atualizados com sucesso.');
      if (this.emit) {
        await this.emit("run.persisted", { changes });
      }
    } else {
      log.info('Nenhuma imagem nova foi baixada. JSONs não alterados.');
      if (this.emit) {
        await this.emit("run.no_changes", {});
      }
    }

    if (this.emit) {
      await this.emit("run.finish", { changes });
    }
  }
}
