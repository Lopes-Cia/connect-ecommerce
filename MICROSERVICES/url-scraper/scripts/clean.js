import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd());
const ASSETS_DIR = path.join(ROOT_DIR, "data", "assets", "files");
const OUTPUT_DIR = path.join(ROOT_DIR, "data", "output");

const FILES_TO_DELETE = [
  path.join(OUTPUT_DIR, "fila.json"),
  path.join(OUTPUT_DIR, "marcas.json"),
  path.join(OUTPUT_DIR, "produtos.json")
];

async function clean() {
  console.log("🧹 Limpando dados gerados...");

  // Limpar assets/files (remover todas as pastas)
  try {
    const items = await fs.readdir(ASSETS_DIR, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && item.name !== ".gitkeep") {
        const itemPath = path.join(ASSETS_DIR, item.name);
        console.log(`Removendo diretório: ${item.name}`);
        await fs.rm(itemPath, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.warn(`Aviso: não foi possível limpar ${ASSETS_DIR}:`, err.message);
  }

  // Remover arquivos de output
  for (const filePath of FILES_TO_DELETE) {
    try {
      await fs.access(filePath);
      console.log(`Removendo arquivo: ${path.basename(filePath)}`);
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.warn(`Aviso: não foi possível remover ${path.basename(filePath)}:`, err.message);
      }
    }
  }

  console.log("✅ Limpeza concluída!");
}

clean().catch((err) => {
  console.error("❌ Erro na limpeza:", err);
  process.exitCode = 1;
});
