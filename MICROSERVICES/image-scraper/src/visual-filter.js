import sharp from "sharp";

function inRange(v, min, max) {
  return v >= min && v <= max;
}

export async function analyzeProductImage(buffer, options = {}) {
  const whiteThreshold = Number(options.whiteThreshold ?? 238);
  const minWhiteRatio = Number(options.minWhiteRatio ?? 0.6);
  const maxObjectCoverage = Number(options.maxObjectCoverage ?? 0.58);
  const minObjectCoverage = Number(options.minObjectCoverage ?? 0.03);
  const maxComponents = Number(options.maxComponents ?? 2);
  const scanSize = Number(options.scanSize ?? 256);

  let img;
  try {
    img = sharp(buffer, { failOn: "none" }).rotate().removeAlpha();
  } catch {
    return { ok: false, reason: "sharp_open_failed" };
  }

  let resized;
  let info;
  try {
    const out = await img
      .resize(scanSize, scanSize, { fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    resized = out.data;
    info = out.info;
  } catch {
    return { ok: false, reason: "sharp_decode_failed" };
  }

  const { width, height, channels } = info || {};
  if (!width || !height || channels < 3) {
    return { ok: false, reason: "invalid_pixels" };
  }

  const total = width * height;
  let whiteCount = 0;
  let objectCount = 0;
  const mask = new Uint8Array(total);

  // Detecta fundo claro e máscara de "objeto não claro"
  for (let i = 0; i < total; i += 1) {
    const p = i * channels;
    const r = resized[p];
    const g = resized[p + 1];
    const b = resized[p + 2];
    const bright = (r + g + b) / 3;
    const isWhiteish = bright >= whiteThreshold;
    if (isWhiteish) {
      whiteCount += 1;
    } else {
      mask[i] = 1;
      objectCount += 1;
    }
  }

  const whiteRatio = whiteCount / total;
  const objectCoverage = objectCount / total;
  if (!inRange(objectCoverage, minObjectCoverage, maxObjectCoverage)) {
    return { ok: false, reason: "object_coverage_out_of_range", whiteRatio, objectCoverage };
  }
  if (whiteRatio < minWhiteRatio) {
    return { ok: false, reason: "background_not_white_enough", whiteRatio, objectCoverage };
  }

  // Conta componentes conectados para reduzir imagens com muitos itens.
  const visited = new Uint8Array(total);
  const q = new Int32Array(total);
  let components = 0;

  const enqueueComponent = (start) => {
    let head = 0;
    let tail = 0;
    q[tail++] = start;
    visited[start] = 1;
    let count = 0;

    while (head < tail) {
      const idx = q[head++];
      count += 1;
      const y = Math.floor(idx / width);
      const x = idx - y * width;

      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (!mask[nIdx] || visited[nIdx]) continue;
        visited[nIdx] = 1;
        q[tail++] = nIdx;
      }
    }

    return count;
  };

  // Ignora fragmentos muito pequenos (ruído)
  const minComponentPixels = Math.max(80, Math.floor(total * 0.002));
  for (let i = 0; i < total; i += 1) {
    if (!mask[i] || visited[i]) continue;
    const size = enqueueComponent(i);
    if (size >= minComponentPixels) {
      components += 1;
      if (components > maxComponents) {
        return { ok: false, reason: "too_many_objects", whiteRatio, objectCoverage, components };
      }
    }
  }

  return {
    ok: true,
    reason: "ok",
    whiteRatio,
    objectCoverage,
    components,
  };
}

