# Plano — ia-store (gatilho AIChat)

## Resumo

Criar um novo store Zustand `ia-store` para controlar o estado do AIChat (on/off) com persistência em `localStorage`, registrar esse store no `control-store` seguindo o padrão do projeto, e migrar o componente `FloatingAiChat` para usar o novo store. Em seguida remover o estado/ações antigas (`copilotoEnabled`, `setCopilotoEnabled`, `toggleCopiloto`) do `control-store`.

## Estado Atual (análise)

- O componente [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx) usa `useControlStore` e faz gate via `copilotoEnabled` (`if (!copilotoEnabled) return null`).
- O estado do gate hoje está em [control-store.ts](file:///c:/LOPES/www/connect-ecommerce/stores/control-store.ts): `copilotoEnabled` + setters.
- Só existem 2 usos de `copilotoEnabled` no repo (o próprio `control-store` e o `FloatingAiChat`) — remoção não deve impactar outras áreas.
- Padrão oficial do projeto (doc): [NEXTJS-STORES-PADRAO.md](file:///c:/LOPES/www/connect-ecommerce/IA/DESENHOS/NEXTJS-STORES-PADRAO.md)
  - UI deve importar apenas `useControlStore`.
  - Novo store deve ser registrado no `control-store`.

## Decisões já confirmadas

- Migrar para o novo store e remover o campo antigo do `control-store`.
- Persistir o estado on/off do AIChat via `localStorage`.

## Mudanças Propostas (arquivos e como)

### 1) Criar o store `ia-store`

- **Adicionar**: `stores/ia-store.ts`
  - Exportar hook `useIaStore`.
  - Estado mínimo:
    - `aiChatEnabled: boolean`
  - Ações mínimas:
    - `setAiChatEnabled(value: boolean): void`
    - `toggleAiChat(): void`
  - Persistência:
    - Armazenar em `localStorage` sob uma chave nova (proposta: `connect_ecommerce_ai_chat_enabled_v1`).
    - Leitura protegida por `typeof window !== "undefined"` e `try/catch`.
    - Inicializar `aiChatEnabled` lendo do `localStorage` na criação do store, para que o gate funcione sem depender do componente estar “on” para hidratar.

### 2) Registrar o novo store no `control-store` (padrão do projeto)

- **Editar**: `stores/control-store.ts`
  - Importar `useIaStore` e expor como `IASTORE` (convenção atual do arquivo).
  - Atualizar `ControlState` para incluir `IASTORE: typeof useIaStore`.
  - Remover:
    - `copilotoEnabled`
    - `setCopilotoEnabled`
    - `toggleCopiloto`
  - Manter as demais referências `*STORE` existentes sem alteração.

### 3) Migrar o componente para o novo gate

- **Editar**: `components/ai/FloatingAiChat.tsx`
  - Manter o padrão “UI importa apenas `useControlStore`”.
  - Trocar:
    - de `const copilotoEnabled = useControlStore((s) => s.copilotoEnabled);`
    - para:
      - `const useIaStore = useControlStore((s) => s.IASTORE);`
      - `const aiChatEnabled = useIaStore((s) => s.aiChatEnabled);`
  - Trocar o gate:
    - de `if (!copilotoEnabled) return null;`
    - para `if (!aiChatEnabled) return null;`
  - Ajustar o `useEffect` inicial e logs (se mantidos) para usar `aiChatEnabled`.

## Critérios de Aceite

- Compila sem erros TypeScript após a migração.
- Não existe mais `copilotoEnabled`/`toggleCopiloto`/`setCopilotoEnabled` no repo.
- `FloatingAiChat` só renderiza quando `aiChatEnabled` estiver `true`.
- O valor de `aiChatEnabled` persiste após refresh (via `localStorage`).

## Verificação (execução segura)

1. Rodar `npm run lint`.
2. Rodar `npm run build` (garante que Next/TS está OK).
3. Rodar `npm run dev` e validar manualmente:
   - Com `localStorage` limpo, AIChat não aparece.
   - Forçar `localStorage.setItem("connect_ecommerce_ai_chat_enabled_v1","1")` e recarregar: AIChat aparece.
   - Setar `"0"` e recarregar: AIChat não aparece.

