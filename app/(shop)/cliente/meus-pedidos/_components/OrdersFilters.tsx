"use client";

import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: string[];
  resultsCount: number;
  isLoading: boolean;
  onRefresh: () => void;
};

export default function OrdersFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  resultsCount,
  isLoading,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-custom-light-300 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full max-w-xl">
          <label className="mb-1.5 block text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
            Buscar por pedido ou item
          </label>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ex.: #9 ou Heineken"
              className="h-10 pr-10 text-xs font-montserrat"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-custom-light-600" />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1.5 block text-[10px] font-montserrat font-semibold uppercase tracking-wider text-custom-light-600">
              Status
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 justify-between gap-2 text-xs font-montserrat"
                  disabled={isLoading}
                >
                  <span className="truncate">{statusFilter}</span>
                  <SlidersHorizontal className="h-3.5 w-3.5 text-custom-light-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filtrar status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={onStatusFilterChange}>
                  {statusOptions.map((option) => (
                    <DropdownMenuRadioItem key={option} value={option}>
                      {option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-end gap-2">
            <div className="rounded-md border border-custom-light-300 bg-custom-light-200/30 px-3 py-2 text-[11px] font-montserrat text-custom-light-600">
              {resultsCount} resultados
            </div>
            <Button
              variant="outline"
              className="h-10 gap-2 text-xs font-montserrat"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

