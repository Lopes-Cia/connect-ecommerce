## Objetivo

Refatorar o `ProductCarousel` para controlar a quantidade de cards visíveis usando apenas 2 breakpoints: **mobile** e **desktop**.

## Escopo

- Alterar somente o comportamento de “quantos itens aparecem por vez” (largura de cada `CarouselItem`).
- Não alterar o número total de itens renderizados (isso continua sendo `products.length`, controlado por quem chama o componente).

## Proposta de API

Adicionar props opcionais em `ProductCarousel`:

- `itemsPerViewMobile?: number` (default: `2`)
- `itemsPerViewDesktop?: number` (default: `4`)
- `desktopBreakpoint?: "lg" | "md"` (default: `"lg"`)

Resultado esperado:
- No mobile (base): cada item ocupa `100 / itemsPerViewMobile %` de largura.
- No desktop (breakpoint configurado): cada item ocupa `100 / itemsPerViewDesktop %` de largura.

## Implementação (passos)

1) Ajustar `ProductCarousel.tsx`
   - Definir defaults das props.
   - Substituir a classe fixa atual do `CarouselItem` por:
     - `className="shrink-0"` (ou equivalente) e controlar `flexBasis` por estilo.
     - `style={{ flexBasis: `${100 / itemsPerViewMobile}%` }}` no base.
     - No desktop, aplicar `style` condicional via `className` + CSS var, ou renderizar duas classes com `basis-[..]` quando os valores forem conhecidos/estáticos.

2) Escolher a estratégia de CSS (a mais segura)
   - Preferência: usar **CSS variable** no wrapper e `basis-[calc(100%/var(--x))]` com um breakpoint (mantém configurável sem “classes dinâmicas”).
   - Alternativa: usar `style` no `CarouselItem`, e duplicar o item com breakpoint (não recomendado), ou aceitar apenas um conjunto de valores predefinidos (não é o objetivo).

3) Ajustar pontos de uso (se necessário)
   - `ProductCarousel` é usado onde o catálogo/home monta a lista; atualizar chamadas para setar `itemsPerViewMobile` e `itemsPerViewDesktop` quando precisar customizar.
   - Manter comportamento atual por defaults se não passar props.

## Validação

- Verificar diagnósticos TypeScript sem erros.
- Conferir visualmente que:
  - no mobile aparecem exatamente `itemsPerViewMobile` cards por “largura de tela” (com scroll horizontal).
  - no desktop aparecem exatamente `itemsPerViewDesktop`.

## Critérios de aceite

- `ProductCarousel` aceita configurar quantidade por breakpoint (mobile/desktop) sem mexer em quem controla `products.length`.
- Defaults não quebram layouts existentes.
- Sem erros TypeScript.
