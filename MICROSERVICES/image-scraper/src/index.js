import "dotenv/config";
import { Command } from "commander";
import crypto from "node:crypto";
import { JsonFileClient } from "./mockend-client.js";
import { ImageScraper } from "./scraper.js";
import { SseHubPublisher } from "./sse-publisher.js";
import { findImageUrlsForTerm } from "./term-url.js";
import { downloadImagesToTermsFolder } from "./download-url.js";

const program = new Command();

function parseCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 3;
  return Math.max(1, Math.min(20, parsed));
}

function parseProfile(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "generic") return "generic";
  return "logo";
}

program
  .name("image-scraper")
  .description("Microservice CLI para coleta de imagens com JSON local")
  .version("1.0.0")
  .option("--target-type <type>", "Tipo de alvo: produto|categoria|marca|banner", process.env.TARGET_TYPE || "produto")
  .option("--term <text>", "MVP: termo → URL → download (salva em data/assets/images/terms)", "")
  .option("--count <n>", "No modo --term: quantas imagens baixar (default 3)", parseCount, 3)
  .option("--profile <name>", "No modo --term: perfil de busca (logo|generic)", parseProfile, "logo")
  .option("--input <path>", "Arquivo JSON de entrada (produtos)", process.env.INPUT_JSON || "./data/input/produtos.json")
  .option("--output <path>", "Arquivo JSON de saída (produtos enriquecidos)", process.env.OUTPUT_JSON || "./data/output/produtos.json")
  .option("--meta <path>", "Arquivo JSON de metadados de imagens", process.env.META_JSON || "./data/output/image-meta.json")
  .option("--not-found <path>", "Fila JSON de produtos sem imagem válida", process.env.NOT_FOUND_JSON || "./data/output/not-found.json")
  .option("--assets-dir <path>", "Diretório físico para salvar imagens", process.env.ASSETS_DIR || "./data/assets/images")
  .option("--assets-base-url <path>", "Base do path salvo no campo image", process.env.ASSETS_BASE_URL || "/assets/images")
  .option("--sse-hub <url>", "SSE Hub base URL", process.env.SSE_HUB_URL || "")
  .option("-s, --safe", "Executar em modo seguro (amostragem 10%)", true)
  .option("--no-safe", "Desativar modo seguro e processar 100%")
  .option("--retry-not-found", "Processar somente a fila de não encontrados", false)
  .action(async (options) => {
    console.log("Iniciando image-scraper com opções:");
    console.log(options);
    
    try {
      const runId = crypto.randomUUID();
      const term = String(options.term || "").trim();
      const count = parseCount(options.count);
      if (term) {
        const profile = parseProfile(options.profile);
        const found = await findImageUrlsForTerm({ term, count, profile, preferTransparent: true });
        if (!found?.ok || !Array.isArray(found.urls) || found.urls.length === 0) {
          console.log(JSON.stringify({ runId, profile, ...found, countRequested: count }, null, 2));
          return;
        }

        const saved = await downloadImagesToTermsFolder({ urls: found.urls, term, count });
        console.log(JSON.stringify({ runId, profile, providers: found.providers ?? [], queries: found.queries ?? [], ...saved }, null, 2));
        return;
      }

      const client = new JsonFileClient({
        inputFile: options.input,
        outputFile: options.output,
        metaFile: options.meta,
        notFoundFile: options.notFound,
        assetsDir: options.assetsDir,
        assetsBaseUrl: options.assetsBaseUrl,
      });
      const publisher = new SseHubPublisher(options.sseHub);

      const summary = {
        runId,
        term: null,
        targetType: options.targetType,
        ok: true,
        notFound: false,
        sourceUrl: "",
        relativePath: "",
      };

      const emit = async (event, data = {}) => {
        if (event === "produto.image_found" && typeof data?.imageUrl === "string") {
          summary.sourceUrl = data.imageUrl;
        }
        if (event === "produto.asset_uploaded" && typeof data?.relativePath === "string") {
          summary.relativePath = data.relativePath;
        }
        if (event === "produto.not_found") {
          summary.notFound = true;
        }

        if (!publisher.enabled()) return;
        try {
          await publisher.publish({
            type: "image-scraper",
            event,
            runId,
            ts: new Date().toISOString(),
            ...data,
          });
        } catch (err) {
          console.warn("[SSE] falha ao publicar evento:", err?.message || err);
        }
      };

      const scraper = new ImageScraper(client, {
        targetType: options.targetType,
        safe: options.safe,
        retryNotFound: options.retryNotFound,
        emit,
      });
      
      await scraper.run();
      console.log("Processo concluído com sucesso!");
      console.log("Resumo:");
      console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
      console.error("Erro fatal na execução:", error);
      process.exit(1);
    }
  });

program.parse();
