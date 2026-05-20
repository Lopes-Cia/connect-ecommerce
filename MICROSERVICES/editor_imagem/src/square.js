import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

function ensureWebpPath(outputPath) {
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === ".webp") return outputPath;
  return path.join(path.dirname(outputPath), `${path.basename(outputPath, ext)}.webp`);
}

export async function toSquareTransparent({ inputPath, outputPath }) {
  const meta = await sharp(inputPath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Não foi possível ler dimensões da imagem.");
  }

  const size = Math.max(meta.width, meta.height);
  const left = Math.floor((size - meta.width) / 2);
  const top = Math.floor((size - meta.height) / 2);

  const finalOutputPath = ensureWebpPath(outputPath);
  await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: inputPath, left, top }]);

  await canvas.webp({ quality: 90 }).toFile(finalOutputPath);
  return { outputPath: finalOutputPath, format: "webp", size };
}
