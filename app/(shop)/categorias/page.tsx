"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useProdutosStore } from "@/stores/produtos-store";
import HomeCategoryCard from "../_components/HomeCategoryCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function CategoriasPage() {
  const categoriasTree = useProdutosStore((s) => s.categoriasTree);
  const categoriasTreeStatus = useProdutosStore((s) => s.categoriasTreeStatus);
  const categoriasTreeError = useProdutosStore((s) => s.categoriasTreeError);
  const loadCategoriasTree = useProdutosStore((s) => s.loadCategoriasTree);

  useEffect(() => {
    void loadCategoriasTree();
  }, [loadCategoriasTree]);

  // useEffect(() => {
  //   void loadCategoriasTree({ source: "lopes", force: true });
  // }, [loadCategoriasTree]);

  const rootCategorias = useMemo(() => {
    const list = categoriasTree ?? [];
    const roots = list.filter((c) => c.parentId === 0);
    return roots.length > 0 ? roots : list;
  }, [categoriasTree]);

  const semCategoria = useMemo(
    () => ({
      id: "0",
      name: "sem categoria",
      image: "http://localhost:4000/assets/images/semImagem.png",
      href: "/categoria/sem-categoria",
    }),
    []
  );

  return (
    <div className="px-4 md:px-20 py-10">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList className="text-xs font-montserrat text-custom-light-600">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Início</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-custom-dark-1000">Categorias</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="font-montserrat text-black text-2xl md:text-3xl font-semibold">
          Categorias
        </h1>
        <p className="mt-1 text-sm text-custom-dark-700 font-montserrat">
          Navegue por todas as categorias disponíveis.
        </p>

        {categoriasTreeStatus === "loading" && rootCategorias.length === 0 && (
          <div className="mt-6 text-sm text-custom-dark-700 font-montserrat">
            Carregando categorias...
          </div>
        )}

        {categoriasTreeStatus === "error" && (
          <div className="mt-6 text-sm text-red-700 font-montserrat">
            Erro ao carregar categorias: {categoriasTreeError ?? "erro inesperado"}
          </div>
        )}

        {categoriasTreeStatus !== "loading" && categoriasTreeStatus !== "error" && rootCategorias.length === 0 && (
          <div className="mt-6 text-sm text-custom-dark-700 font-montserrat">
            Nenhuma categoria disponível no momento.
          </div>
        )}

        {rootCategorias.length > 0 && (
          <section className="mt-8 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <HomeCategoryCard
              key={semCategoria.id}
              id={semCategoria.id}
              name={semCategoria.name}
              image={semCategoria.image}
              href={semCategoria.href}
            />
            {rootCategorias.map((category) => (
              <HomeCategoryCard
                key={String(category.id)}
                id={String(category.id)}
                name={category.name}
                image={category.image}
                href={category.slug}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
