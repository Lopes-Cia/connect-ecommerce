import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findImageUrlsForQueries } from "../../image-scraper/src/term-url.js";
import { downloadImagesToTermsFolder } from "../../image-scraper/src/download-url.js";

type FindImageUrlsForQueriesResult = {
  ok: boolean;
  urls: string[];
  providers: string[];
  queries: string[];
};

type FindImageUrlsForQueriesFn = (params: {
  queries: string[];
  count?: number;
}) => Promise<FindImageUrlsForQueriesResult>;

type DownloadQuality = {
  minBytes?: number;
  minWidth?: number;
  minHeight?: number;
};

type DownloadItem = {
  ok: boolean;
  term: string;
  url: string;
  savedPath: string;
  bytes: number;
  contentType: string;
  width: number;
  height: number;
  status: number;
  statusText?: string;
  error?: string;
};

type DownloadImagesToTermsFolderResult = {
  ok: boolean;
  term: string;
  countRequested: number;
  countAttempted: number;
  items: DownloadItem[];
};

type DownloadImagesToTermsFolderFn = (params: {
  urls: string[];
  term: string;
  count?: number;
  outDir?: string;
  quality?: DownloadQuality;
}) => Promise<DownloadImagesToTermsFolderResult>;

const findImageUrlsForQueriesTyped = findImageUrlsForQueries as unknown as FindImageUrlsForQueriesFn;
const downloadImagesToTermsFolderTyped = downloadImagesToTermsFolder as unknown as DownloadImagesToTermsFolderFn;

const ImageScraperTermDownloadInputSchema = z
  .object({
    name: z.string().min(1),
    queries: z.array(z.string().min(1)).min(1).max(10),
    count: z.number().int().min(1).max(10).default(3),
    quality: z
      .object({
        minBytes: z.number().int().min(1).optional(),
        minWidth: z.number().int().min(1).optional(),
        minHeight: z.number().int().min(1).optional(),
      })
      .strict()
      .optional(),
    outDir: z.string().optional(),
  })
  .strict();

type ImageScraperTermDownloadInput = z.infer<typeof ImageScraperTermDownloadInputSchema>;

const ImageScraperTermDownloadOutputSchema = z
  .object({
    ok: z.boolean(),
    name: z.string(),
    countRequested: z.number().int(),
    countSaved: z.number().int(),
    queries: z.array(z.string()),
    providers: z.array(z.string()),
    items: z.array(
      z
        .object({
          ok: z.boolean(),
          url: z.string(),
          savedPath: z.string(),
          bytes: z.number().int(),
          contentType: z.string(),
          width: z.number().int(),
          height: z.number().int(),
          status: z.number().int(),
          error: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict();

type ImageScraperTermDownloadOutput = z.infer<typeof ImageScraperTermDownloadOutputSchema>;

function buildDefaultOutDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../image-scraper/data/assets/images/terms");
}

type LocalAssetsIndexFile = {
  version: 1;
  rootDir: string;
  generatedAt: string;
  items: Array<{
    relPath: string;
    kind: "logo" | "image";
    tokens: string[];
    sizeBytes?: number;
    mtimeMs?: number;
  }>;
};

type LocalAssetsIndex = {
  indexFilePath: string;
  rootDir: string;
  generatedAt: string;
  items: Array<{
    relPath: string;
    absPath: string;
    kind: "logo" | "image";
    tokens: string[];
    tokenSet: Set<string>;
    text: string;
    sizeBytes: number;
  }>;
};

let localAssetsIndexCache: LocalAssetsIndex | null = null;
let localAssetsIndexLoading: Promise<LocalAssetsIndex> | null = null;

function buildDefaultLocalAssetsRootDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../url-scraper/data/assets/files");
}

function buildLocalAssetsIndexFilePath(rootDir: string): string {
  return path.join(rootDir, ".image-index.json");
}

function normalizeForSearch(value: string): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string): string[] {
  const normalized = normalizeForSearch(value).replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized.split(/\s+/g).filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    if (part.length === 0) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    unique.push(part);
  }
  return unique;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function safeFilenamePart(value: string): string {
  const tokens = tokenize(value).slice(0, 8);
  const joined = tokens.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return joined || "term";
}

function buildKindFromRelPath(relPath: string): "logo" | "image" {
  const p = normalizeForSearch(relPath);
  if (p.includes("logo") || p.includes("logotipo") || p.includes("logotipos")) return "logo";
  return "image";
}

async function tryReadJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function coerceTokensFromConfigJson(configJson: unknown): string[] {
  if (!configJson || typeof configJson !== "object") return [];
  const cfg = configJson as Record<string, unknown>;
  const nome = typeof cfg.nome === "string" ? cfg.nome : "";
  const url = typeof cfg.url === "string" ? cfg.url : "";
  return [...tokenize(nome), ...tokenize(url)];
}

async function buildLocalAssetsIndexFile(rootDir: string): Promise<LocalAssetsIndexFile> {
  const allowedExt = new Set([".webp"]);
  const items: LocalAssetsIndexFile["items"] = [];

  const scanDir = async (absDir: string, relDir: string, inheritedTokens: string[]): Promise<void> => {
    let dirents: Array<import("node:fs").Dirent> = [];
    try {
      dirents = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    let nextTokens = inheritedTokens;
    const hasConfig = dirents.some((d) => d?.isFile?.() && d.name === "config.json");
    if (hasConfig) {
      const configPath = path.join(absDir, "config.json");
      const configJson = await tryReadJsonFile(configPath);
      if (configJson) {
        const cfgTokens = coerceTokensFromConfigJson(configJson);
        if (cfgTokens.length > 0) nextTokens = [...nextTokens, ...cfgTokens];
      }
    }

    const fileCandidates: Array<{
      absPath: string;
      childRelPath: string;
      kind: "logo" | "image";
      tokens: string[];
    }> = [];

    for (const dirent of dirents) {
      if (!dirent?.name) continue;
      if (dirent.name.startsWith(".")) continue;

      const absPath = path.join(absDir, dirent.name);
      const childRelPath = relDir ? path.posix.join(relDir, dirent.name) : dirent.name;

      if (dirent.isDirectory()) {
        const dirTokens = tokenize(dirent.name);
        await scanDir(absPath, childRelPath, [...nextTokens, ...dirTokens]);
        continue;
      }

      if (!dirent.isFile()) continue;
      const ext = path.extname(dirent.name).toLowerCase();
      if (!allowedExt.has(ext)) continue;

      const baseName = path.parse(dirent.name).name;
      const fileTokens = [...tokenize(baseName), ...tokenize(childRelPath)];

      fileCandidates.push({
        absPath,
        childRelPath,
        kind: buildKindFromRelPath(childRelPath),
        tokens: uniqueStrings([...nextTokens, ...fileTokens]),
      });
    }

    const batchSize = 16;
    for (let i = 0; i < fileCandidates.length; i += batchSize) {
      const batch = fileCandidates.slice(i, i + batchSize);
      const stats = await Promise.all(
        batch.map(async (c) => {
          try {
            const st = await fs.stat(c.absPath);
            const sizeBytes = Number.isFinite(st.size) ? st.size : 0;
            const mtimeMs = Number.isFinite(st.mtimeMs) ? st.mtimeMs : 0;
            return { sizeBytes, mtimeMs };
          } catch {
            return { sizeBytes: 0, mtimeMs: 0 };
          }
        })
      );

      for (let j = 0; j < batch.length; j += 1) {
        const c = batch[j];
        const st = stats[j];
        items.push({
          relPath: c.childRelPath,
          kind: c.kind,
          tokens: c.tokens,
          sizeBytes: st.sizeBytes,
          mtimeMs: st.mtimeMs,
        });
      }
    }
  };

  await scanDir(rootDir, "", tokenize(path.basename(rootDir)));

  return {
    version: 1,
    rootDir,
    generatedAt: new Date().toISOString(),
    items,
  };
}

async function loadOrBuildLocalAssetsIndex(params?: {
  rootDir?: string;
  rebuild?: boolean;
}): Promise<LocalAssetsIndex> {
  const rootDir = params?.rootDir ? params.rootDir : buildDefaultLocalAssetsRootDir();
  const indexFilePath = buildLocalAssetsIndexFilePath(rootDir);
  const rebuild = Boolean(params?.rebuild);

  if (!rebuild && localAssetsIndexCache?.indexFilePath === indexFilePath) {
    return localAssetsIndexCache;
  }

  if (localAssetsIndexLoading) {
    return localAssetsIndexLoading;
  }

  localAssetsIndexLoading = (async () => {
    let rootStat: import("node:fs").Stats | null = null;
    try {
      rootStat = await fs.stat(rootDir);
    } catch {
      rootStat = null;
    }
    if (!rootStat || !rootStat.isDirectory()) {
      throw new Error(`local_assets_root_not_found:${rootDir}`);
    }

    let indexFile: LocalAssetsIndexFile | null = null;
    if (!rebuild) {
      const read = await tryReadJsonFile(indexFilePath);
      if (read && typeof read === "object") {
        const maybe = read as Partial<LocalAssetsIndexFile>;
        if (maybe.version === 1 && typeof maybe.rootDir === "string" && Array.isArray(maybe.items)) {
          indexFile = maybe as LocalAssetsIndexFile;
        }
      }
    }

    if (!indexFile) {
      indexFile = await buildLocalAssetsIndexFile(rootDir);
      await fs.writeFile(indexFilePath, JSON.stringify(indexFile), "utf8");
    }

    const items: LocalAssetsIndex["items"] = (indexFile.items ?? [])
      .filter((it) => it && typeof it.relPath === "string" && Array.isArray(it.tokens))
      .filter((it) => path.extname(String(it.relPath)).toLowerCase() === ".webp")
      .map((it) => {
        const relPath = String(it.relPath);
        const absPath = path.join(rootDir, relPath.split("/").join(path.sep));
        const tokens = Array.from(new Set((it.tokens ?? []).flatMap((t) => tokenize(String(t)))));
        const tokenSet = new Set(tokens);
        const kind: "logo" | "image" = it.kind === "logo" ? "logo" : "image";
        const text = `${normalizeForSearch(relPath)} ${tokens.join(" ")}`;
        const sizeBytes = Number.isFinite(Number(it.sizeBytes)) ? Number(it.sizeBytes) : 0;
        return { relPath, absPath, kind, tokens, tokenSet, text, sizeBytes };
      });

    const index: LocalAssetsIndex = {
      indexFilePath,
      rootDir,
      generatedAt: String(indexFile.generatedAt || new Date().toISOString()),
      items,
    };

    localAssetsIndexCache = index;
    localAssetsIndexLoading = null;
    return index;
  })().catch((err) => {
    localAssetsIndexLoading = null;
    throw err;
  });

  return localAssetsIndexLoading;
}

function searchLocalAssetsIndex(params: {
  index: LocalAssetsIndex;
  query: string;
  count: number;
  minScore: number;
  kind?: "logo" | "image";
}): Array<{ relPath: string; absPath: string; kind: "logo" | "image"; score: number; sizeBytes: number }> {
  const queryTokens = tokenize(params.query);
  if (queryTokens.length === 0) return [];

  const queryNormalized = normalizeForSearch(params.query);
  const results: Array<{ relPath: string; absPath: string; kind: "logo" | "image"; score: number; sizeBytes: number }> =
    [];

  for (const item of params.index.items) {
    if (params.kind && item.kind !== params.kind) continue;

    let score = 0;
    for (const qt of queryTokens) {
      if (item.tokenSet.has(qt)) score += 3;
      else if (qt.length >= 3 && item.text.includes(qt)) score += 1;
    }
    if (queryNormalized.length >= 3 && item.text.includes(queryNormalized)) score += 2;

    if (score < params.minScore) continue;
    results.push({ relPath: item.relPath, absPath: item.absPath, kind: item.kind, score, sizeBytes: item.sizeBytes });
  }

  results.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.relPath.localeCompare(b.relPath)));
  return results.slice(0, Math.max(1, Math.min(100, params.count)));
}

function formatErrorOutput(params: {
  name: string;
  countRequested: number;
  queries: string[];
  message: string;
}): ImageScraperTermDownloadOutput {
  return {
    ok: false,
    name: params.name,
    countRequested: params.countRequested,
    countSaved: 0,
    queries: params.queries,
    providers: [],
    items: [
      {
        ok: false,
        url: "",
        savedPath: "",
        bytes: 0,
        contentType: "",
        width: 0,
        height: 0,
        status: 0,
        error: params.message,
      },
    ],
  };
}

const server = new McpServer({
  name: "image-scraper-mcp-server",
  version: "1.0.0",
});

const LocalAssetsSearchInputSchema = z
  .object({
    query: z.string().min(1),
    count: z.number().int().min(1).max(50).default(10),
    minScore: z.number().int().min(1).max(100).default(3),
    kind: z.enum(["logo", "image"]).optional(),
    rootDir: z.string().optional(),
    rebuildIndex: z.boolean().optional(),
  })
  .strict();

type LocalAssetsSearchInput = z.infer<typeof LocalAssetsSearchInputSchema>;

const LocalAssetsSearchOutputSchema = z
  .object({
    ok: z.boolean(),
    query: z.string(),
    count: z.number().int(),
    rootDir: z.string(),
    indexFilePath: z.string(),
    generatedAt: z.string(),
    totalIndexed: z.number().int(),
    items: z.array(
      z
        .object({
          relPath: z.string(),
          absPath: z.string(),
          kind: z.enum(["logo", "image"]),
          score: z.number().int(),
          sizeBytes: z.number().int(),
        })
        .strict(),
    ),
    error: z.string().optional(),
  })
  .strict();

type LocalAssetsSearchOutput = z.infer<typeof LocalAssetsSearchOutputSchema>;

server.registerTool(
  "image_local_assets_search",
  {
    title: "Image Local Assets: search (url-scraper/assets/files)",
    description:
      "Pesquisa imagens locais já existentes em MICROSERVICES/url-scraper/data/assets/files (usa index .image-index.json; cria automaticamente se não existir).",
    inputSchema: LocalAssetsSearchInputSchema,
    outputSchema: LocalAssetsSearchOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params: LocalAssetsSearchInput) => {
    if (process.env.IMAGE_SCRAPER_MCP_ENABLED !== "1") {
      const output: LocalAssetsSearchOutput = {
        ok: false,
        query: params.query,
        count: params.count ?? 10,
        rootDir: params.rootDir ? params.rootDir : buildDefaultLocalAssetsRootDir(),
        indexFilePath: "",
        generatedAt: "",
        totalIndexed: 0,
        items: [],
        error: "IMAGE_SCRAPER_MCP_ENABLED!=1",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }

    try {
      const index = await loadOrBuildLocalAssetsIndex({
        rootDir: params.rootDir,
        rebuild: Boolean(params.rebuildIndex),
      });
      const count = params.count ?? 10;
      const minScore = params.minScore ?? 3;
      const items = searchLocalAssetsIndex({
        index,
        query: params.query,
        count,
        minScore,
        kind: params.kind,
      }).map((it) => ({
        relPath: it.relPath,
        absPath: it.absPath,
        kind: it.kind,
        score: it.score,
        sizeBytes: Number.isFinite(Number(it.sizeBytes)) ? Number(it.sizeBytes) : 0,
      }));

      const output: LocalAssetsSearchOutput = {
        ok: true,
        query: params.query,
        count,
        rootDir: index.rootDir,
        indexFilePath: index.indexFilePath,
        generatedAt: index.generatedAt,
        totalIndexed: index.items.length,
        items,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    } catch (err) {
      const output: LocalAssetsSearchOutput = {
        ok: false,
        query: params.query,
        count: params.count ?? 10,
        rootDir: params.rootDir ? params.rootDir : buildDefaultLocalAssetsRootDir(),
        indexFilePath: "",
        generatedAt: "",
        totalIndexed: 0,
        items: [],
        error: err instanceof Error ? err.message : "unexpected_error",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  },
);

const ImageScraperTermResolveInputSchema = ImageScraperTermDownloadInputSchema.extend({
  localFirst: z.boolean().default(true),
  localRootDir: z.string().optional(),
  localMinScore: z.number().int().min(1).max(100).default(3),
  localKind: z.enum(["logo", "image"]).optional(),
}).strict();

type ImageScraperTermResolveInput = z.infer<typeof ImageScraperTermResolveInputSchema>;

const ImageScraperTermResolveOutputSchema = ImageScraperTermDownloadOutputSchema.extend({
  source: z.enum(["local", "remote"]),
  localHits: z.number().int(),
}).strict();

type ImageScraperTermResolveOutput = z.infer<typeof ImageScraperTermResolveOutputSchema>;

server.registerTool(
  "image_scraper_term_resolve",
  {
    title: "Image Scraper: local-first resolve (fallback remoto)",
    description:
      "Tenta resolver imagens via index local (url-scraper/assets/files). Se não encontrar, faz fallback para download remoto via MICROSERVICES/image-scraper.",
    inputSchema: ImageScraperTermResolveInputSchema,
    outputSchema: ImageScraperTermResolveOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (params: ImageScraperTermResolveInput) => {
    const countRequested = params.count ?? 3;

    if (process.env.IMAGE_SCRAPER_MCP_ENABLED !== "1") {
      const base = formatErrorOutput({
        name: params.name,
        countRequested,
        queries: params.queries,
        message: "IMAGE_SCRAPER_MCP_ENABLED!=1",
      });
      const output: ImageScraperTermResolveOutput = { ...base, source: "remote", localHits: 0 };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }

    const resolvedOutDir = params.outDir
      ? path.isAbsolute(params.outDir)
        ? params.outDir
        : ""
      : buildDefaultOutDir();
    if (!resolvedOutDir) {
      const base = formatErrorOutput({
        name: params.name,
        countRequested,
        queries: params.queries,
        message: "outDir_deve_ser_absoluto",
      });
      const output: ImageScraperTermResolveOutput = { ...base, source: "remote", localHits: 0 };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }

    if (params.localFirst) {
      try {
        const index = await loadOrBuildLocalAssetsIndex({
          rootDir: params.localRootDir,
          rebuild: false,
        });
        const query = [params.name, ...(params.queries ?? [])].filter(Boolean).join(" ");
        const localHits = searchLocalAssetsIndex({
          index,
          query,
          count: countRequested,
          minScore: params.localMinScore ?? 3,
          kind: params.localKind,
        });
        if (localHits.length > 0) {
          const items: ImageScraperTermDownloadOutput["items"] = [];
          await fs.mkdir(resolvedOutDir, { recursive: true });
          const prefix = safeFilenamePart(params.name);
          for (let i = 0; i < localHits.length; i += 1) {
            const hit = localHits[i];
            const ext = path.extname(hit.absPath).toLowerCase() || ".png";
            const destFilename = `${prefix}-local-${i + 1}${ext}`;
            const destPath = path.join(resolvedOutDir, destFilename);
            try {
              await fs.copyFile(hit.absPath, destPath);
              let bytes = 0;
              try {
                const st = await fs.stat(destPath);
                bytes = Number.isFinite(st.size) ? st.size : 0;
              } catch {
                bytes = 0;
              }
              items.push({
                ok: true,
                url: "",
                savedPath: destPath,
                bytes,
                contentType: "",
                width: 0,
                height: 0,
                status: 200,
              });
            } catch (err) {
              items.push({
                ok: false,
                url: "",
                savedPath: destPath,
                bytes: 0,
                contentType: "",
                width: 0,
                height: 0,
                status: 0,
                error: err instanceof Error ? err.message : "copy_failed",
              });
            }
          }

          const output: ImageScraperTermResolveOutput = {
            ok: true,
            name: params.name,
            countRequested,
            countSaved: items.length,
            queries: params.queries,
            providers: [],
            items,
            source: "local",
            localHits: items.length,
          };
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        }
      } catch {
      }
    }

    try {
      const found = await findImageUrlsForQueriesTyped({
        queries: params.queries,
        count: countRequested,
      });
      if (!found?.ok || !Array.isArray(found.urls) || found.urls.length === 0) {
        const base = formatErrorOutput({
          name: params.name,
          countRequested,
          queries: params.queries,
          message: "no_urls_found",
        });
        const output: ImageScraperTermResolveOutput = { ...base, source: "remote", localHits: 0 };
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      }

      const saved = await downloadImagesToTermsFolderTyped({
        urls: found.urls,
        term: params.name,
        count: countRequested,
        outDir: resolvedOutDir,
        quality: params.quality,
      });

      const items: DownloadItem[] = Array.isArray(saved?.items) ? saved.items : [];
      const countSaved = items.filter((it) => it?.ok).length;
      const output: ImageScraperTermResolveOutput = {
        ok: Boolean(saved?.ok),
        name: params.name,
        countRequested,
        countSaved,
        queries: params.queries,
        providers: Array.isArray(found?.providers) ? found.providers : [],
        items: items.map((it) => ({
          ok: Boolean(it?.ok),
          url: String(it?.url || ""),
          savedPath: String(it?.savedPath || ""),
          bytes: Number.isFinite(Number(it?.bytes)) ? Number(it?.bytes) : 0,
          contentType: String(it?.contentType || ""),
          width: Number.isFinite(Number(it?.width)) ? Number(it?.width) : 0,
          height: Number.isFinite(Number(it?.height)) ? Number(it?.height) : 0,
          status: Number.isFinite(Number(it?.status)) ? Number(it?.status) : 0,
          ...(it?.error ? { error: String(it.error) } : {}),
        })),
        source: "remote",
        localHits: 0,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    } catch (err) {
      const base = formatErrorOutput({
        name: params.name,
        countRequested,
        queries: params.queries,
        message: err instanceof Error ? err.message : "unexpected_error",
      });
      const output: ImageScraperTermResolveOutput = { ...base, source: "remote", localHits: 0 };
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  },
);

server.registerTool(
  "image_scraper_term_download",
  {
    title: "Image Scraper: termo + queries -> download",
    description:
      "Busca URLs de imagens a partir de queries (DuckDuckGo) e salva N imagens em disco, reusando o microservice legado MICROSERVICES/image-scraper.",
    inputSchema: ImageScraperTermDownloadInputSchema,
    outputSchema: ImageScraperTermDownloadOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (params: ImageScraperTermDownloadInput) => {
    const countRequested = params.count ?? 3;

    if (process.env.IMAGE_SCRAPER_MCP_ENABLED !== "1") {
      const output = formatErrorOutput({
        name: params.name,
        countRequested,
        queries: params.queries,
        message: "IMAGE_SCRAPER_MCP_ENABLED!=1",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }

    const resolvedOutDir = params.outDir
      ? path.isAbsolute(params.outDir)
        ? params.outDir
        : ""
      : buildDefaultOutDir();
    if (!resolvedOutDir) {
      const output = formatErrorOutput({
        name: params.name,
        countRequested,
        queries: params.queries,
        message: "outDir_deve_ser_absoluto",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }

    try {
      const found = await findImageUrlsForQueriesTyped({
        queries: params.queries,
        count: countRequested,
      });
      if (!found?.ok || !Array.isArray(found.urls) || found.urls.length === 0) {
        const output = formatErrorOutput({
          name: params.name,
          countRequested,
          queries: params.queries,
          message: "no_urls_found",
        });
        return {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      }

      const saved = await downloadImagesToTermsFolderTyped({
        urls: found.urls,
        term: params.name,
        count: countRequested,
        outDir: resolvedOutDir,
        quality: params.quality,
      });

      const items: DownloadItem[] = Array.isArray(saved?.items) ? saved.items : [];
      const countSaved = items.filter((it) => it?.ok).length;
      const output: ImageScraperTermDownloadOutput = {
        ok: Boolean(saved?.ok),
        name: params.name,
        countRequested,
        countSaved,
        queries: params.queries,
        providers: Array.isArray(found?.providers) ? found.providers : [],
        items: items.map((it) => ({
          ok: Boolean(it?.ok),
          url: String(it?.url || ""),
          savedPath: String(it?.savedPath || ""),
          bytes: Number.isFinite(Number(it?.bytes)) ? Number(it?.bytes) : 0,
          contentType: String(it?.contentType || ""),
          width: Number.isFinite(Number(it?.width)) ? Number(it?.width) : 0,
          height: Number.isFinite(Number(it?.height)) ? Number(it?.height) : 0,
          status: Number.isFinite(Number(it?.status)) ? Number(it?.status) : 0,
          ...(it?.error ? { error: String(it.error) } : {}),
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    } catch (err) {
      const output = formatErrorOutput({
        name: params.name,
        countRequested,
        queries: params.queries,
        message: err instanceof Error ? err.message : "unexpected_error",
      });
      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("image-scraper-mcp-server:stdio");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
