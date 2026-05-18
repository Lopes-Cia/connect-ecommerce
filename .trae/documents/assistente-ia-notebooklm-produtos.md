# Plano — Assistente IA estilo NotebookLM (Produtos / ERP)

## Resumo

Evoluir o **Assistente IA (FloatingAiChat)** para um fluxo parecido com o **NotebookLM**: ao carregar o **JSON de produtos integrados** (usando `/api/lopes/produtos-loja`), mostrar uma **visão geral de gestão do ecommerce** em uma **coluna à esquerda** e abrir um **chat** para perguntas mais específicas. O contexto usado pelo assistente deve ser baseado **apenas na chave `data`** do retorno, e devemos suportar um modo “híbrido”: a IA sugere um **filtro/consulta estruturada** e o app executa esse filtro na coleção completa para calcular números.

## Estado Atual (baseado no repo)

- UI do assistente: [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx)
  - Existe sidebar colapsável e subitens (Produtos > ERP/Redis/Categorias/Marcas/Infos; Home > Banners/Coleções A/B).
  - O container do chat hoje está com `z-40` (antes era `z-[999999]`), permitindo que o `Dialog` (z-50) fique por cima.
- Seção ERP já existe como componente: [ErpSection.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/sections/ErpSection.tsx)
  - Tem botão fixo “Ver produtos integrados” e abre `Dialog` exibindo JSON.
  - Ainda precisa alinhar: fonte `/api/lopes/produtos-loja` e “mostrar apenas `data`”.
- Endpoint IA atual (texto livre): `POST /api/ai/brand-assistant` em [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/ai/brand-assistant/route.ts)
  - Input: `{ message, productContext }`.
  - Prompt usa `IA/ASSISTANT_CONTEXT.md` + “dados da página” (texto/DOM).
  - Resposta: `{ answer: string }`.
- Endpoint de produtos (proxy Lopes): `GET /api/lopes/produtos-loja` em [route.ts](file:///c:/LOPES/www/connect-ecommerce/app/api/lopes/produtos-loja/route.ts)
  - Retorna o payload “como vier do back”; pode ser array direto ou objeto com `data`.
  - Padrões existentes para unwrap: `unwrapData` (ex.: [produtosService.ts](file:///c:/LOPES/www/connect-ecommerce/lib/integration/produtosService.ts#L57-L66)) e `readListFrom` (ex.: [raw.ts](file:///c:/LOPES/www/connect-ecommerce/liz_refator/contracts/lopes/raw.ts#L31-L37)).

## Objetivo / Critérios de Sucesso

- **ERP**: ao clicar em “Ver produtos integrados”, carregar o dataset de produtos (somente `data`) e:
  - Mostrar **Visão Geral** (coluna esquerda) com métricas úteis: total, sem estoque, com estoque, faixa de preço, sem imagem, por categoria/marca (top N), etc.
  - Exibir um **modal RAW** com o JSON **apenas de `data`**.
  - Manter um **chat** (coluna direita) para perguntas específicas, sempre usando o dataset como contexto.
- **Híbrido (IA → filtro → cálculo real)**:
  - A IA retorna uma **consulta estruturada** (JSON) para filtrar/contar/agrupar.
  - O app aplica isso na coleção completa e devolve os números reais ao usuário (e/ou pede para a IA formatar a resposta final).
- UX: semelhante ao NotebookLM:
  - **Coluna esquerda**: “Notas / Visão Geral”.
  - **Coluna direita**: chat.

## Decisões já confirmadas

- Fonte do dataset: **`/api/lopes/produtos-loja`**.
- Contexto para IA: **híbrido** (enviar amostra + schema; IA devolve filtro; app calcula em cima do dataset completo; usar IA para formatação).
- Layout: **Visão Geral em coluna esquerda**.

## Proposta de Implementação (decisão completa)

### 1) Normalização do payload (somente `data`)

Criar um util compartilhado para “desembrulhar” o retorno e sempre operar sobre `data`:

- **Novo arquivo**: `lib/ai/catalog/unwrap.ts`
  - `unwrapData(payload)` → se existir `payload.data`, retorna `payload.data`, senão retorna `payload`.
  - `unwrapList(payload)` → garante array (`[]` se não for array).

Aplicar em:
- [ErpSection.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/sections/ErpSection.tsx)
  - Ao exibir RAW no modal: mostrar `stringifyJson(unwrapData(payload))`.
  - Ao montar contexto: usar `const items = unwrapList(payload)`.

### 2) Seção ERP no estilo NotebookLM (split interno)

Refatorar a seção ERP para renderizar uma “shell” de seção:

- **Atualizar**: [ErpSection.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/sections/ErpSection.tsx)
  - Trocar `fetch` para `GET /api/lopes/produtos-loja`.
  - Guardar `items` em estado (`rawItems`).
  - Renderizar layout:
    - Top bar sticky: botão “Ver produtos integrados” + “Abrir RAW (data)”.
    - Body: `grid` 2 colunas no desktop:
      - **Esquerda**: painel “Visão geral” (métricas calculadas) + “Nota da IA” (texto gerado).
      - **Direita**: painel de chat (reusar a lista de mensagens do assistente).
  - Exportar callbacks:
    - `onCatalogLoaded(items, sample, schema, computedOverview)` para integrar com o chat.

### 3) Cálculo determinístico de métricas (visão geral)

Implementar cálculo local para métricas básicas (sem IA):

- **Novo arquivo**: `lib/ai/catalog/metrics.ts`
  - Detectar/normalizar campos prováveis do produto integrado (baseado em [Product](file:///c:/LOPES/www/connect-ecommerce/lib/types/product.ts)):
    - estoque: `qtEstoque` (fallback: `indiceEstoque`)
    - preço: `preco`
    - imagem: `imagem` / `imagens[0]`
    - categoria: `categoria` / `categoriaPrinciapal`
    - marca: se existir (`marca`, `brand`, etc.), senão “não informado”.
  - Métricas:
    - total de produtos
    - com estoque / sem estoque
    - com imagem / sem imagem
    - min/max/mediana de preço (com tratamento de valores inválidos)
    - top N categorias (count)
    - top N marcas (count) se existir

Essas métricas alimentam a “Visão Geral” imediatamente (rápido, confiável).

### 4) Modo híbrido: IA gera “query spec” e app executa

Criar um “mini-contrato” de consulta para a IA devolver, e um executor local.

- **Novo endpoint**: `POST /api/ai/catalog-query` (server route)
  - Input:
    - `question: string`
    - `schema: { fields: Array<{ name: string; type: string; examples?: string[] }> }`
    - `sample: unknown[]` (ex.: 20–40 itens)
  - Output (JSON estrito):
    ```json
    {
      "intent": "count" | "list" | "group_by",
      "filters": [{ "field": "qtEstoque", "op": "<=", "value": 0 }],
      "groupBy": "categoria",
      "limit": 10,
      "notes": "texto curto"
    }
    ```
  - Regras no prompt:
    - usar apenas campos do schema
    - quando não souber o campo, pedir “unknown_field”
    - nunca inventar números

- **Novo arquivo**: `lib/ai/catalog/query.ts`
  - Parser/validador do spec (com `zod`).
  - Executor:
    - `applyFilters(items, filters)`
    - `runIntent(items, spec)` → retorna `result` estruturado.
  - Suportar ops mínimas (MVP):
    - `==`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `in`, `isEmpty`, `exists`
  - Limitar `list` por `limit` e truncar campos para exibição.

### 5) IA para “Notas/Resumo” e para “formatação final”

Usar o endpoint existente [brand-assistant](file:///c:/LOPES/www/connect-ecommerce/app/api/ai/brand-assistant/route.ts) em dois momentos:

1) **Nota inicial** (Visão Geral):
   - Enviar `message` como “Gere uma visão geral para gestão do ecommerce…”
   - Contexto incluído no prompt:
     - métricas calculadas (sempre)
     - schema
     - amostra (limitada)
   - Exibir a resposta no painel esquerdo (“Nota da IA”).

2) **Pergunta do usuário**:
   - Passo A: chamar `/api/ai/catalog-query` para obter `query spec`.
   - Passo B: executar no dataset completo no client e obter `result`.
   - Passo C: chamar `brand-assistant` com:
     - pergunta original
     - `result` calculado
     - instrução: “formate em bullets, seja direto, traga números e ressalvas”.

### 6) Integração no FloatingAiChat

- Ajustar [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx) para:
  - Quando `activeView === "produtos_erp"`, renderizar o layout ERP (que inclui painel esquerdo + chat).
  - “Chat” do assistente deve usar um sender único que:
    - injeta o contexto do ERP (métricas + schema + amostra + últimos resultados) nas chamadas ao backend.

## Assunções

- O retorno de `/api/lopes/produtos-loja` contém um array em `data` **ou** já é um array direto; vamos tratar ambos.
- O dataset pode ser grande; por isso:
  - A amostra enviada ao modelo será limitada (ex.: 30 itens).
  - O cálculo real de números será feito localmente na coleção completa.

## Verificação (preferência: só diagnósticos)

- Verificar diagnósticos TS/JS após mudanças.
- Checagem manual rápida:
  - Abrir Assistente IA → Produtos → ERP
  - Clicar “Ver produtos integrados”
  - Confirmar: painel de Visão Geral preenche; modal RAW mostra somente `data`; chat responde perguntas com números calculados.

