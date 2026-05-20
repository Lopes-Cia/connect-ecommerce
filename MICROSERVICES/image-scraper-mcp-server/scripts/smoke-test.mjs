import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");
const serverEntry = path.resolve(serverRoot, "dist/index.js");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  cwd: serverRoot,
  env: {
    ...getDefaultEnvironment(),
    IMAGE_SCRAPER_MCP_ENABLED: "1",
  },
  stderr: "inherit",
});

const client = new Client(
  { name: "image-scraper-mcp-smoke", version: "1.0.0" },
  { capabilities: {} },
);

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = Array.isArray(tools?.tools) ? tools.tools.map((t) => String(t?.name || "")).filter(Boolean) : [];
  const required = ["image_local_assets_search", "image_scraper_term_resolve", "image_scraper_term_download"];
  for (const name of required) {
    if (!toolNames.includes(name)) throw new Error(`tool_not_found:${name}`);
  }

  const localSearch = await client.callTool({
    name: "image_local_assets_search",
    arguments: {
      query: "brahma",
      count: 3,
      kind: "logo",
    },
  });

  console.log(JSON.stringify({ step: "image_local_assets_search", localSearch }, null, 2));
  const localSc =
    localSearch && typeof localSearch === "object" && "structuredContent" in localSearch ? localSearch.structuredContent : null;
  const hasLocalItems = Boolean(localSc && typeof localSc === "object" && "ok" in localSc && localSc.ok && Array.isArray(localSc.items) && localSc.items.length > 0);
  if (!hasLocalItems) {
    process.exitCode = 1;
  }

  const resolved = await client.callTool({
    name: "image_scraper_term_resolve",
    arguments: {
      name: "smoke-test-local",
      queries: ["brahma", "brahma logo"],
      count: 1,
      localFirst: true,
      localKind: "logo",
    },
  });
  console.log(JSON.stringify({ step: "image_scraper_term_resolve", resolved }, null, 2));
  const resolvedSc =
    resolved && typeof resolved === "object" && "structuredContent" in resolved ? resolved.structuredContent : null;
  const okResolved = Boolean(resolvedSc && typeof resolvedSc === "object" && "ok" in resolvedSc && resolvedSc.ok);
  const source = resolvedSc && typeof resolvedSc === "object" && "source" in resolvedSc ? String(resolvedSc.source || "") : "";
  if (!okResolved || source !== "local") {
    process.exitCode = 1;
  }

  const runRemote = String(process.env.RUN_REMOTE_IMAGE_SCRAPER_TEST || "").trim() === "1";
  if (runRemote) {
    const remote = await client.callTool({
      name: "image_scraper_term_download",
      arguments: {
        name: "smoke-test-remote",
        queries: ["Brahma logo", "logo Brahma png", "Brahma logotipo"],
        count: 1,
      },
    });
    console.log(JSON.stringify({ step: "image_scraper_term_download", remote }, null, 2));
    const remoteSc =
      remote && typeof remote === "object" && "structuredContent" in remote ? remote.structuredContent : null;
    const okRemote = Boolean(remoteSc && typeof remoteSc === "object" && "ok" in remoteSc && remoteSc.ok);
    if (!okRemote) process.exitCode = 1;
  }
} finally {
  await transport.close().catch(() => {});
}
