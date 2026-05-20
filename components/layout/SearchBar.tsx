"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

export default function SearchBar() {
  return (
    <Suspense fallback={<div className="w-full max-w-160 h-[2.3rem]" />}>
      <SearchBarInner />
    </Suspense>
  );
}

function SearchBarInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialValue = useMemo(() => (pathname === "/busca" ? (searchParams.get("q") ?? "") : ""), [pathname, searchParams]);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function submit(raw: string) {
    const q = String(raw ?? "").trim();
    if (!q) return;
    const usp = new URLSearchParams();
    usp.set("q", q);
    router.push(`/busca?${usp.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      role="search"
      className="flex items-center max-h-8 bg-white relative w-full max-w-160 rounded-xs"
    >
      <input
        type="text"
        placeholder="Pesquise em toda a loja"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-montserrat font-medium text-[0.85em] text-black/90 w-full max-h-[2.3rem] pl-10 pr-4 py-2 outline-none border-none"
      />
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        size={18}
      />
    </form>
  );
}
