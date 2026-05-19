import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJsonOrThrow(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export class JsonFileClient {
  constructor({ inputFile, outputFile, metaFile, notFoundFile, assetsDir, assetsBaseUrl, catalogOverride }) {
    this.inputFile = path.resolve(process.cwd(), inputFile);
    this.outputFile = path.resolve(process.cwd(), outputFile);
    this.metaFile = path.resolve(process.cwd(), metaFile);
    this.notFoundFile = path.resolve(process.cwd(), notFoundFile);
    this.assetsDir = path.resolve(process.cwd(), assetsDir);
    this.assetsBaseUrl = String(assetsBaseUrl || "/assets/images").replace(/\/$/, "");
    this.catalogOverride = Array.isArray(catalogOverride) ? catalogOverride : null;

    fs.mkdirSync(this.assetsDir, { recursive: true });
    ensureDirForFile(this.outputFile);
    ensureDirForFile(this.metaFile);
    ensureDirForFile(this.notFoundFile);
  }

  async getCatalog(type) {
    if (type !== "produtos") {
      throw new Error(`Tipo de catálogo não suportado no modo JSON: ${type}`);
    }
    if (this.catalogOverride) {
      if (!Array.isArray(this.catalogOverride)) {
        throw new Error("Catálogo override inválido: produtos deve ser um array");
      }
      return this.catalogOverride;
    }
    if (!fs.existsSync(this.inputFile)) {
      throw new Error(`Arquivo de entrada não encontrado: ${this.inputFile}`);
    }
    const data = readJsonOrThrow(this.inputFile);
    if (!Array.isArray(data)) {
      throw new Error("JSON de entrada inválido: produtos deve ser um array");
    }
    return data;
  }

  async uploadAsset(fileName, buffer) {
    const normalizedFileName = String(fileName).replace(/\\/g, "/");
    const absolutePath = path.resolve(this.assetsDir, normalizedFileName);
    ensureDirForFile(absolutePath);
    fs.writeFileSync(absolutePath, buffer);
    return `${this.assetsBaseUrl}/${normalizedFileName}`;
  }

  async updateJson(type, data) {
    if (type !== "produtos") {
      throw new Error(`Tipo de JSON não suportado no modo local: ${type}`);
    }
    fs.writeFileSync(this.outputFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  async getMeta() {
    if (!fs.existsSync(this.metaFile)) {
      return {};
    }
    const data = readJsonOrThrow(this.metaFile);
    return data && typeof data === "object" ? data : {};
  }

  async updateMeta(metaData) {
    fs.writeFileSync(this.metaFile, JSON.stringify(metaData, null, 2) + "\n", "utf8");
  }

  async getNotFound() {
    if (!fs.existsSync(this.notFoundFile)) {
      return [];
    }
    const data = readJsonOrThrow(this.notFoundFile);
    return Array.isArray(data) ? data : [];
  }

  async updateNotFound(rows) {
    fs.writeFileSync(this.notFoundFile, JSON.stringify(rows, null, 2) + "\n", "utf8");
  }
}

export function generateShortHash(input) {
  return crypto.createHash("md5").update(input).digest("hex").substring(0, 6);
}
