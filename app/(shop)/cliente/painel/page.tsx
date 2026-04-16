"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useClientesStore } from "@/stores/clientes-store";

export default function ClientePainelPage() {
  const router = useRouter();
  const isLoggedIn = useClientesStore((s) => s.isLoggedIn);
  const loginData = useClientesStore((s) => s.loginData);
  const logout = useClientesStore((s) => s.logout);

  useEffect(() => {
    if (isLoggedIn) return;
    router.replace("/login");
  }, [isLoggedIn, router]);

  return (
    <div className="bg-white py-10 px-4 md:px-8">
      <h1 className="font-montserrat text-black text-2xl font-semibold">cliente / painel</h1>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-700 font-montserrat">Sessão do cliente</div>
          <button
            type="button"
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50 transition font-montserrat"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Logoff
          </button>
        </div>

        <pre className="mt-4 whitespace-pre-wrap break-words rounded border bg-gray-50 p-4 text-xs text-gray-800">
          {JSON.stringify(loginData, null, 2)}
        </pre>
      </div>
    </div>
  );
}

