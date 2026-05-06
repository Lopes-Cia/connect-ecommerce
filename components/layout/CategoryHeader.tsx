"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import useCheckIsMobile from "@/hooks/useCheckIsMobile";
import type { CategoriaNode } from "@/lib/types/produtos";
import { useProdutosStore } from "@/stores/produtos-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

let _clientMounted = false;
const _mountedListeners = new Set<() => void>();

function subscribeMounted(listener: () => void) {
  _mountedListeners.add(listener);
  return () => _mountedListeners.delete(listener);
}

function getMountedSnapshot() {
  return _clientMounted;
}

function getMountedServerSnapshot() {
  return false;
}

function markMounted() {
  if (_clientMounted) return;
  _clientMounted = true;
  for (const listener of Array.from(_mountedListeners)) listener();
}

export default function CategoryHeader() {
  const isMobile = useCheckIsMobile();
  const categoriasTree = useProdutosStore((s) => s.categoriasTree);
  const categoriasTreeStatus = useProdutosStore((s) => s.categoriasTreeStatus);
  const categoriasTreeError = useProdutosStore((s) => s.categoriasTreeError);
  const loadCategoriasTree = useProdutosStore((s) => s.loadCategoriasTree);
  const [open, setOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
  const [query, setQuery] = useState("");
  const [activeRootId, setActiveRootId] = useState<string | null>(null);

  useEffect(() => {
    markMounted();
  }, []);

  useEffect(() => {
    void loadCategoriasTree().catch((error) => {
      console.error("Falha ao carregar categorias no header", error);
    });
  }, [loadCategoriasTree]);

  const rootCategorias = useMemo(() => categoriasTree ?? [], [categoriasTree]);

  const filteredRootCategorias = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rootCategorias;
    return rootCategorias.filter((c) => c.name.toLowerCase().includes(q));
  }, [query, rootCategorias]);

  const resolvedActiveRootId = useMemo(() => {
    if (filteredRootCategorias.length === 0) return null;
    if (activeRootId && filteredRootCategorias.some((c) => String(c.id) === String(activeRootId))) {
      return activeRootId;
    }
    return String(filteredRootCategorias[0].id);
  }, [activeRootId, filteredRootCategorias]);

  const activeRoot = useMemo(() => {
    if (filteredRootCategorias.length === 0) return null;
    const found = resolvedActiveRootId
      ? filteredRootCategorias.find((c) => String(c.id) === String(resolvedActiveRootId))
      : undefined;
    return found ?? filteredRootCategorias[0];
  }, [filteredRootCategorias, resolvedActiveRootId]);

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
              align="center"
              sideOffset={12}
              className="w-[min(1100px,calc(100vw-2rem))] p-0 normal-case"
              onMouseEnter={handleOpen}
              onMouseLeave={handleCloseSoon}
            >
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold tracking-normal">Categorias</div>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/categoria/sem-categoria"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Sem categoria
                    </Link>
                    <Separator orientation="vertical" className="h-5" />
                    <Link
                      href="/categorias"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Ver todas →
                    </Link>
                  </div>
                </div>

                <div className="mt-4">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar categoria..."
                    className="h-10"
                  />
                </div>

                <div className="mt-5 grid grid-cols-[280px_1fr] gap-6">
                  <div className="rounded-lg border bg-muted/30">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                      Departamentos
                    </div>
                    <div className="max-h-[60vh] overflow-auto p-1">
                      {categoriasTreeStatus === "loading" && rootCategorias.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">Carregando...</div>
                      ) : categoriasTreeStatus === "error" ? (
                        <div className="px-2 py-2 text-sm text-destructive">
                          {categoriasTreeError ?? "Falha ao carregar categorias."}
                        </div>
                      ) : filteredRootCategorias.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-muted-foreground">
                          Nenhuma categoria encontrada.
                        </div>
                      ) : (
                        filteredRootCategorias.map((root) => {
                          const isActive = String(resolvedActiveRootId) === String(root.id);
                          return (
                            <DropdownMenuItem
                              key={`root-${root.id}`}
                              asChild
                              className={[
                                "cursor-pointer py-2.5",
                                isActive ? "bg-accent text-accent-foreground" : "",
                              ].join(" ")}
                            >
                              <Link
                                href={root.slug}
                                onMouseEnter={() => setActiveRootId(String(root.id))}
                                onFocus={() => setActiveRootId(String(root.id))}
                              >
                                {root.name}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_260px] gap-6">
                    <div className="min-w-0">
                      {activeRoot ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          {((activeRoot.children ?? []) as CategoriaNode[]).length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              Sem subcategorias.
                            </div>
                          ) : (
                            ((activeRoot.children ?? []) as CategoriaNode[]).map((child) => {
                              const level3 = (child.children ?? []) as CategoriaNode[];
                              return (
                                <div key={`l2-${child.id}`} className="min-w-0">
                                  <Link
                                    href={child.slug}
                                    className="text-sm font-semibold text-foreground hover:underline"
                                  >
                                    {child.name}
                                  </Link>
                                  {level3.length === 0 ? null : (
                                    <ul className="mt-2 space-y-1">
                                      {level3.slice(0, 8).map((leaf) => (
                                        <li key={`l3-${leaf.id}`}>
                                          <Link
                                            href={leaf.slug}
                                            className="text-sm text-muted-foreground hover:text-foreground"
                                          >
                                            {leaf.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Selecione uma categoria para ver as opções.
                        </div>
                      )}

                      {activeRoot ? (
                        <div className="mt-5">
                          <Link
                            href={activeRoot.slug}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            Ver tudo em {activeRoot.name} →
                          </Link>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <Link
                        href="/ofertas"
                        className="block rounded-xl border p-4 hover:bg-accent"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">Ofertas da semana</div>
                          <Badge variant="secondary">-%</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground tracking-normal">
                          Descontos por tempo limitado.
                        </div>
                      </Link>

                      <Link
                        href="/mais-vendidos"
                        className="block rounded-xl border p-4 hover:bg-accent"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold">Mais vendidos</div>
                          <Badge variant="secondary">Top</Badge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground tracking-normal">
                          Os itens mais comprados da loja.
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {process.env.NODE_ENV !== "production" ? (
            <Link href="/dev" className="hover:underline">
              TEST API
            </Link>
          ) : null}
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
