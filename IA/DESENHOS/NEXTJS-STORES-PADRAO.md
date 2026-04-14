# Next.js Stores Pattern (Contexto Atual)

## Escopo

Este desenho define o padrão atual para gerenciamento de stores no projeto:

- `control-store.ts` e o gerenciador central de stores.
- A UI importa apenas `useControlStore`.
- Novo store sempre entra no `control-store` no momento da criacao.

Referencias:

- [control-store.ts](file:///c:/LOPES/www/MDK-DEV/WWW/MICROSERVICE/devdash/src/stores/control-store.ts)
- [control-app.tsx](file:///c:/LOPES/www/MDK-DEV/WWW/MICROSERVICE/devdash/src/app/_components/control-app.tsx)

---

## Instalacao

Biblioteca base:

```bash
npm i zustand
```

---

## Desenho Arquitetural

```mermaid
flowchart TD
  UI[Componentes React/Next] -->|importa| CTRL[useControlStore]
  CTRL --> S1[useStoreA]
  CTRL --> S2[useStoreB]
  S1 --> API1[/api/...]
  S2 --> API2[/api/...]
```

Regras:

- UI nao importa store de dominio direto.
- UI nao chama `/api/...` direto.
- Store de dominio concentra estado + acoes + fetch.
- `control-store` expone os stores para consumo unico na UI.

---

## Estrutura

```txt
src/
  stores/
    control-store.ts
    <novo-dominio>-store.ts
  app/
    _components/
      control-app.tsx   // exemplo de consumo
```

---

## Template de Novo Store

Arquivo: `src/stores/<novo-dominio>-store.ts`

```ts
import { create } from "zustand";

type NovoState = {
  desiredUp: boolean;
  isBusy: boolean;
  error: string;
};

type NovoActions = {
  refresh: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

export const useNovoStore = create<NovoState & NovoActions>((set, get) => ({
  desiredUp: true,
  isBusy: false,
  error: "",

  refresh: async () => {
    // fetch de status/process do dominio
  },

  start: async () => {
    set((s) => ({ ...s, isBusy: true, error: "", desiredUp: true }));
    try {
      // POST start
      await get().refresh();
    } finally {
      set((s) => ({ ...s, isBusy: false }));
    }
  },

  stop: async () => {
    set((s) => ({ ...s, isBusy: true, error: "", desiredUp: false }));
    try {
      // POST stop
      await get().refresh();
    } finally {
      set((s) => ({ ...s, isBusy: false }));
    }
  },
}));
```

---

## Template de Registro no Control Store

Arquivo: `src/stores/control-store.ts`

```ts
import { create } from "zustand";
import { useJobsStore } from "./jobs-store";
import { useMockEndStore } from "./mockend-store";
import { useSeedStore } from "./seed-store";
import { useTenantStore } from "./tenant-store";
import { useNovoStore } from "./novo-store";

type ControlState = {
  JOBSSTORE: typeof useJobsStore;
  MOCKSTORE: typeof useMockEndStore;
  SEEDSTORE: typeof useSeedStore;
  TENANTSTORE: typeof useTenantStore;
  NOVOSTORE: typeof useNovoStore;
};

export const useControlStore = create<ControlState>(() => ({
  JOBSSTORE: useJobsStore,
  MOCKSTORE: useMockEndStore,
  SEEDSTORE: useSeedStore,
  TENANTSTORE: useTenantStore,
  NOVOSTORE: useNovoStore,
}));
```

---

## Template de Consumo (UI)

Arquivo de exemplo: `control-app.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useControlStore } from "@/stores/control-store";

export function ControlAppExample() {
  const STORE = useControlStore();

  const desiredUp = STORE.NOVOSTORE((s) => s.desiredUp);
  const isBusy = STORE.NOVOSTORE((s) => s.isBusy);
  const refresh = STORE.NOVOSTORE((s) => s.refresh);
  const start = STORE.NOVOSTORE((s) => s.start);
  const stop = STORE.NOVOSTORE((s) => s.stop);

  useEffect(() => {
    refresh().catch(() => null);
  }, [refresh]);

  useEffect(() => {
    if (desiredUp && !isBusy) start().catch(() => null);
    if (!desiredUp && !isBusy) stop().catch(() => null);
  }, [desiredUp, isBusy, start, stop]);

  return null;
}
```

---

## Regra Operacional

Quando voce pedir "criar novo store", o fluxo obrigatorio e:

1. Criar `src/stores/<novo-dominio>-store.ts`.
2. Importar no `src/stores/control-store.ts`.
3. Registrar no tipo `ControlState`.
4. Registrar no retorno do `useControlStore`.
5. Consumir na UI apenas via `useControlStore`.
