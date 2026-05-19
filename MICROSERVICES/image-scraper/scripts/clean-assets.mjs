import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const assetsDir = path.join(projectRoot, "data", "assets", "images", "produtos");
const outputDir = path.join(projectRoot, "data", "output");

function cleanDirKeepGitkeep(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });

  for (const entry of fs.readdirSync(dirPath)) {
    if (entry === ".gitkeep") continue;
    const entryPath = path.join(dirPath, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }

  const gitkeepFile = path.join(dirPath, ".gitkeep");
  if (!fs.existsSync(gitkeepFile)) {
    fs.writeFileSync(gitkeepFile, "\n", "utf8");
  }
}

cleanDirKeepGitkeep(assetsDir);
cleanDirKeepGitkeep(outputDir);

console.log(`Assets limpos: ${assetsDir}`);
console.log(`Output limpo: ${outputDir}`);
