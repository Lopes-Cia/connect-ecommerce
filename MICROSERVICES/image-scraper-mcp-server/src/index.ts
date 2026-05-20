import path from "node:path";
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
