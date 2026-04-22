function safeString(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return safeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  const s = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return s || "item";
}

function toIntOrZero(value) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNumberOrNull(value) {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function detectSizeLabel(text) {
  const t = normalizeText(text);
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\b/);
  if (!m) return "";
  const raw = safeString(m[1]).replace(",", ".");
  const qty = Number(raw);
  if (!Number.isFinite(qty)) return "";
  const unit = safeString(m[2]).toLowerCase();
  const isInt = Number.isInteger(qty);
  const qStr = isInt ? String(qty) : String(qty).replace(/\.0+$/, "");
  if (unit === "ml") return `${qStr}ml`;
  if (unit === "l") return `${qStr}L`;
  if (unit === "g") return `${qStr}g`;
  if (unit === "kg") return `${qStr}kg`;
  return `${qStr}${unit}`;
}

function detectUnitLabel(text, codVol) {
  const t = normalizeText(text);
  if (t.includes("long neck")) return "long neck";
  if (t.includes("growler")) return "growler";
  if (t.includes("lata")) return "lata";
  if (t.includes("frasco")) return "frasco";
  if (t.includes("envelope")) return "envelope";
  if (t.includes("caixa")) return "caixa";
  const cv = normalizeText(codVol);
  return cv || "un";
}

function detectBadges() {
  return [];
}

function buildCategorySlugById(byId, id) {
  const visited = new Set();
  const segments = [];
  let current = id;
  while (current && !visited.has(current)) {
    visited.add(current);
    const c = byId.get(current);
    if (!c) break;
    segments.push(slugify(c.name));
    current = toIntOrZero(c.parentId);
  }
  segments.reverse();
  const rest = segments.join("/");
  return `/categoria/${rest || "sem-categoria"}`;
}

export function translateCategorias(raw) {
  const brandImageFallback = "http://localhost:4000/assets/images/semImagem.png";
  const categoryFallback = { id: 0, name: "sem categoria", slug: "/categoria/sem-categoria", parentId: 0, image: brandImageFallback, order: 0 };

  const items = Array.isArray(raw) ? raw : [];
  const categoriesBody = items.map((c) => {
    const id = toIntOrZero(c?.codigo ?? c?.id);
    const parentId = toIntOrZero(c?.codPai ?? c?.parentId);
    const name = safeString(c?.categoria ?? c?.name) || `Categoria ${id}`;
    const image = safeString(c?.imagem ?? c?.image) || brandImageFallback;
    const order = toIntOrZero(c?.sequencia ?? c?.order) || id;
    return { id, name, slug: "", parentId, image, order };
  });

  const byId = new Map(categoriesBody.map((c) => [toIntOrZero(c.id), c]));
  for (const c of categoriesBody) {
    c.slug = buildCategorySlugById(byId, toIntOrZero(c.id));
  }

  const byIdMerged = new Map();
  byIdMerged.set(0, categoryFallback);
  for (const c of categoriesBody) byIdMerged.set(toIntOrZero(c.id), c);

  return Array.from(byIdMerged.values()).sort((a, b) => {
    const ap = toIntOrZero(a.parentId);
    const bp = toIntOrZero(b.parentId);
    if (ap !== bp) return ap - bp;
    const ao = toIntOrZero(a.order);
    const bo = toIntOrZero(b.order);
    if (ao !== bo) return ao - bo;
    return toIntOrZero(a.id) - toIntOrZero(b.id);
  });
}

export function translateProdutos(raw) {
  const imageFallback = "http://localhost:4000/assets/images/semImagem.png";
  const brandFallback = { id: 0, name: "No Brand", slug: "/marca/no-brand", image: imageFallback };

  const items = Array.isArray(raw) ? raw : [];

  return items.map((it) => {
    const id = toIntOrZero(it?.codProd ?? it?.id);
    const name = safeString(it?.descricaoEcomerce ?? it?.descricaoEcommerce) || safeString(it?.descricaoErp ?? it?.name) || `Produto ${id}`;
    const baseSlug = slugify(name);
    const slug = `/produtos/${baseSlug}-${id}`;

    const ean = safeString(it?.ean ?? it?.barcode);
    const sku = ean && normalizeText(ean) !== "null" ? `${ean}-${id}` : `${baseSlug}-${id}`;

    const unitLabel = detectUnitLabel(name, it?.codVol ?? it?.unitLabel);
    const sizeLabel = detectSizeLabel(name);

    const price = toNumberOrNull(it?.preco ?? it?.price);
    const stock = toIntOrZero(it?.qtEstoque ?? it?.stock);

    const catId = toIntOrZero(it?.categoriaPrinciapal ?? it?.categoriaPrincipal ?? it?.categoryId ?? it?.category?.id);
    const category = {
      id: catId,
      name: "sem categoria",
      slug: "/categoria/sem-categoria",
      familia: [{ id: catId, name: "sem categoria", slug: "/categoria/sem-categoria" }],
    };

    const image = safeString(it?.imagem ?? it?.image) || imageFallback;

    return {
      id,
      sku,
      name,
      slug,
      unitLabel,
      sizeLabel,
      price,
      compareAtPrice: null,
      badges: detectBadges(name),
      image,
      stock,
      inStock: stock > 0,
      category,
      brand: brandFallback,
    };
  });
}

export function buildFallbackBrands() {
  return [
    {
      id: 0,
      name: "No Brand",
      slug: "/marca/no-brand",
      image: "http://localhost:4000/assets/images/semImagem.png",
    },
  ];
}

