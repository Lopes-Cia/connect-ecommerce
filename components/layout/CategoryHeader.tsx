"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import type { CategoriaNode } from "@/lib/types/produtos";
import { useProdutosStore } from "@/stores/produtos-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CategoryHeader() {
  const isMobile = useCheckIsMobile();
  const router = useRouter();
  const categoriasTree = useProdutosStore((s) => s.categoriasTree);
  const categoriasTreeStatus = useProdutosStore((s) => s.categoriasTreeStatus);
  const categoriasTreeError = useProdutosStore((s) => s.categoriasTreeError);
  const loadCategoriasTree = useProdutosStore((s) => s.loadCategoriasTree);
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    void loadCategoriasTree().catch((error) => {
      console.error("Falha ao carregar categorias no header", error);
    });
  }, [loadCategoriasTree]);

  const rootCategorias = useMemo(() => categoriasTree ?? [], [categoriasTree]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleOpen = () => {
    clearCloseTimeout();
    setOpen(true);
  };

  const handleCloseSoon = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 240);
  };

  if (!mounted || isMobile) {
    return (
      <div className="flex justify-center items-center h-8 bg-tints-carbon-black">
        <Link
          href="/categorias"
          className="text-white font-montserrat font-medium text-[0.7em] uppercase text-sm hover:underline"
        >
          Categorias
        </Link>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-12 bg-black/90">
      <nav className="max-w-[var(--width-content-md)] lg:max-w-[var(--width-content-lg)] mx-auto flex gap-8 justify-center items-center text-white font-montserrat font-medium text-[0.78em] uppercase">
        <div className="flex items-center gap-3">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <div
              className="inline-flex items-center gap-1 group"
              onMouseEnter={handleOpen}
              onMouseLeave={handleCloseSoon}
            >
              <Link
                href="/categorias"
                className="relative after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-px after:bg-current after:origin-left after:scale-x-0 after:transition-transform after:duration-150 group-hover:after:scale-x-100"
              >
                Categorias
              </Link>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent
              align="start"
              className="w-[22rem] normal-case"
              onMouseEnter={handleOpen}
              onMouseLeave={handleCloseSoon}
            >
              <DropdownMenuLabel>Categorias</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/categoria/sem-categoria">Sem categoria</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {categoriasTreeStatus === "loading" && rootCategorias.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Carregando...</div>
              ) : categoriasTreeStatus === "error" ? (
                <div className="px-2 py-1.5 text-sm text-destructive">
                  {categoriasTreeError ?? "Falha ao carregar categorias."}
                </div>
              ) : rootCategorias.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhuma categoria disponível.
                </div>
              ) : (
                rootCategorias.map((root) => {
                  const level2 = (root.children ?? []) as CategoriaNode[];
                  return (
                    <DropdownMenuSub key={`root-${root.id}`}>
                      <DropdownMenuSubTrigger onClick={() => router.push(root.slug)}>
                        {root.name}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-[22rem]">
                        {level2.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Sem subcategorias.
                          </div>
                        ) : (
                          level2.map((child) => {
                            const level3 = (child.children ?? []) as CategoriaNode[];
                            if (level3.length === 0) {
                              return (
                                <DropdownMenuItem key={`l2-${child.id}`} asChild>
                                  <Link href={child.slug}>{child.name}</Link>
                                </DropdownMenuItem>
                              );
                            }
                            return (
                              <DropdownMenuSub key={`l2-${child.id}`}>
                                <DropdownMenuSubTrigger onClick={() => router.push(child.slug)}>
                                  {child.name}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-[22rem]">
                                  {level3.map((leaf) => (
                                    <DropdownMenuItem key={`l3-${leaf.id}`} asChild>
                                      <Link href={leaf.slug}>{leaf.name}</Link>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            );
                          })
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/dev" className="hover:underline">
            TEST API
          </Link>
        </div>
        <a href="#" className="hover:underline">
          Promoções
        </a>
        <a href="#" className="hover:underline">
          Bebidas
        </a>
        <a href="#" className="hover:underline">
          Laticínios
        </a>
        <a href="#" className="hover:underline">
          Mercearia
        </a>
        <a href="#" className="hover:underline">
          Limpeza
        </a>
      </nav>
    </div>
  );
}
