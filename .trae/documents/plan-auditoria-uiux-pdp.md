# Plano — Auditoria UI/UX (PDP) + Melhorias P0/P1

## Resumo

Auditar a página de produto (PDP) no fluxo atual (desktop e mobile) usando inspeção em navegador e revisão de código, identificar fricções de conversão e inconsistências de UX, e implementar melhorias priorizadas **P0 + P1** com mudanças mínimas e seguras.

## Estado Atual (baseado em inspeção do repo + navegador)

- A PDP está em `app/(shop)/produtos/[...slug]/produto-client.tsx`.
- Layout atual: breadcrumb → grid (galeria à esquerda, bloco de resumo + bloco de compra à direita) → tabs (Descrição/Informações adicionais) → carrossel de recomendados.
- Evidências observadas em navegação:
  - Duplicação de oferta/preço em dois blocos (Resumo e Buy Box).
  - CTAs com a mesma hierarquia visual (“Adicionar ao carrinho” e “Comprar agora” iguais).
  - Exposição de “Estoque” numérico para usuário final.
  - Link de “Ver mais opções de pagamento…” aponta para `#` (fricção/percepção de incompleto).
  - Lacunas de a11y: tabs com vínculo incompleto tab↔panel; zoom de imagem em `<div>` clicável sem semântica/teclas.

## Objetivo e Critério de Sucesso

### Objetivo

Melhorar conversão e clareza “above the fold” na PDP, reduzindo fricção para compra e deixando a oferta/CTA inequívocos.

### Critérios de sucesso (P0/P1)

- Oferta (preço + condições) aparece **uma vez** no “bloco de compra” (ou um único lugar definido), sem duplicação concorrente.
- CTA primário e secundário ficam visualmente diferentes e consistentes com o design do site.
- “Estoque (número)” não aparece para usuário final; apenas disponibilidade.
- Tabs e zoom funcionam com navegação por teclado básica (Enter/Espaço; Esc fecha zoom).
- Buy box fica mais “comprável” no scroll (sticky desktop e/ou barra mobile, versão mínima).
- Sem erros de TypeScript (diagnósticos) nos arquivos tocados.

## Escopo

- **Inclui**: somente PDP (`/produtos/*`).
- **Inclui (implementar)**: melhorias P0 + P1 focadas em conversão.
- **Não inclui**: implementar cálculo real de frete/CEP; reviews; variações de produto; mudanças de API/contratos além do estritamente necessário para UI.

## Principais Problemas e Melhorias (Backlog Prioritário)

### P0 (crítico para conversão)

1. **Unificar a oferta e reduzir redundância**
   - Problema: preço/condições duplicados (Resumo + Buy box), disputando atenção do CTA.
   - Mudança: deixar preço/condições apenas no `ProductActivity` (buy box) e tornar o `ProductSummary` focado em título + metadados essenciais (sem repetir oferta).
   - Arquivos:
     - `app/(shop)/produtos/_components/ProductSummary.tsx`
     - `app/(shop)/produtos/_components/ProductActivity.tsx`
     - `app/(shop)/produtos/[...slug]/produto-client.tsx`

2. **Diferenciar CTA primário vs secundário**
   - Problema: “Adicionar ao carrinho” e “Comprar agora” iguais.
   - Mudança: um CTA “filled” e outro “outline/ghost” (decisão fixa: primário = Adicionar ao carrinho; secundário = Comprar agora).
   - Arquivo: `app/(shop)/produtos/_components/ProductActivity.tsx`

3. **Remover “Estoque (número)” do conteúdo para usuário**
   - Problema: “Estoque: 12432” reduz confiança e expõe dado operacional.
   - Mudança: remover o item “Estoque” da lista `specs` no `toProdutoDetailViewModel` (manter “Disponibilidade”).
   - Arquivo: `lib/produtos/viewModels.ts`

4. **Corrigir links que hoje apontam para “#”**
   - Problema: gera fricção e sensação de incompleto.
   - Mudança mínima e segura: substituir o link por texto/botão desabilitado “Em breve” (sem navegação).
   - Arquivo: `app/(shop)/produtos/_components/ProductActivity.tsx`

5. **A11y mínimo em tabs e zoom**
   - Tabs: adicionar `id` nos tabs e `aria-labelledby` nos panels + navegação por teclado (setas esquerda/direita opcional).
   - Zoom: trocar container clicável por `<button>` com `aria-label`; fechar com `Esc`; garantir que clique fora fecha sem prender foco.
   - Arquivos:
     - `app/(shop)/produtos/_components/ProductInfoTabs.tsx`
     - `app/(shop)/produtos/_components/ImageViewer.tsx`

### P1 (melhoria forte de usabilidade/escaneabilidade)

6. **Reduzir densidade de specs acima da dobra**
   - Mudança: mover tabela completa para “Informações adicionais” e, no topo, exibir 3–5 atributos como “chips” (ex.: Unidade, Tamanho, Marca, Categoria, SKU).
   - Arquivos:
     - `app/(shop)/produtos/_components/ProductSummary.tsx`
     - `app/(shop)/produtos/_components/ProductInfoTabs.tsx`

7. **Buy box sticky (versão mínima)**
   - Desktop: `ProductActivity` com `sticky` e `top-*` em `lg+`.
   - Mobile (mínimo): barra fixa inferior com preço + CTA principal (sem duplicar lógica; chamar o mesmo handler).
   - Arquivo: `app/(shop)/produtos/[...slug]/produto-client.tsx` (composição/layout)

8. **CEP com UX segura (sem integração)**
   - Mudança mínima: máscara + validação simples + remover `console.log` (ou manter, mas sem UX falsa).
   - Se não houver endpoint, exibir mensagem “Em breve” ao invés de simular busca.
   - Arquivo: `app/(shop)/produtos/_components/ProductActivity.tsx`

## Plano de Implementação (passo a passo)

1. **Capturar baseline no navegador**
   - Desktop: screenshot “above the fold” e seção de CTAs.
   - Mobile: screenshot acima da dobra e comportamento de scroll até tabs/recomendados.

2. **P0: Unificar oferta e ajustar CTA**
   - Ajustar `ProductSummary` para não exibir preço/condições duplicadas.
   - Ajustar `ProductActivity` para ser o “único” bloco de oferta/compra.
   - Diferenciar estilos dos CTAs (primary/secondary) e revisar estados (disabled/inStock).

3. **P0: Remover “Estoque” numérico do view model**
   - Atualizar `toProdutoDetailViewModel` removendo o item “Estoque” de `specs`.
   - Confirmar que a PDP continua exibindo disponibilidade.

4. **P0: Links “#” e a11y mínimo**
   - Substituir link de pagamento por UI “Em breve” sem navegação.
   - Tabs: completar `aria-labelledby` e comportamento de teclado.
   - Zoom: ajustar semântica para `<button>` e suportar `Esc`.

5. **P1: Densidade e sticky**
   - Mover tabela completa para “Informações adicionais”.
   - Criar chips no topo com atributos essenciais.
   - Implementar sticky desktop do buy box e barra mobile mínima (se não degradar layout).

6. **Verificação**
   - Diagnósticos TypeScript (sem erros).
   - Navegação manual: teclado nos tabs; `Esc` no zoom; CTAs funcionais (adicionar/comprar).
   - Conferir duplicação removida (preço/condições apenas uma vez).
   - Conferir que não aparece “Estoque: <número>”.

## Decisões e Suposições (travadas)

- Escopo somente PDP.
- Prioridade principal: conversão (P0), mas implementar também P1.
- Não criar novas APIs nem integrar frete/CEP nesta etapa; UI deve ser honesta (sem prometer consulta real).

