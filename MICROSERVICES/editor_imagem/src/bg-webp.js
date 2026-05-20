import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function bgToWebp({ inputPngPath, backgroundColor, outputWebpPath }) {
  const meta = await sharp(inputPngPath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Não foi possível ler dimensões da imagem.");
  }

  await fs.mkdir(path.dirname(outputWebpPath), { recursive: true });

  const bg = sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 4,
      background: backgroundColor,
    },
  });

  await bg
    .composite([{ input: inputPngPath }])
    .webp({ quality: 90 })
    .toFile(outputWebpPath);

  return { outputPath: outputWebpPath };
}

