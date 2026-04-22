import ProdutoClient from "./produto-client";

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const resolved = await params;
  const slugPath = `/produtos/${resolved.slug.join("/")}`;
  return <ProdutoClient slugPath={slugPath} />;
}

