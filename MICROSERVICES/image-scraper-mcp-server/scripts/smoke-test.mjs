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
  const hasTool = Array.isArray(tools?.tools)
    ? tools.tools.some((t) => t?.name === "image_scraper_term_download")
    : false;
  if (!hasTool) {
    throw new Error("tool_not_found:image_scraper_term_download");
  }

  const result = await client.callTool({
    name: "image_scraper_term_download",
    arguments: {
      name: "smoke-test",
      queries: ["Brahma logo", "logo Brahma png", "Brahma logotipo"],
      count: 3,
    },
  });

  console.log(JSON.stringify(result, null, 2));

  if (result && typeof result === "object" && "structuredContent" in result) {
    const sc = result.structuredContent;
    if (sc && typeof sc === "object" && "ok" in sc) {
      process.exitCode = Boolean(sc.ok) ? 0 : 1;
    }
  }
} finally {
  await transport.close().catch(() => {});
}
