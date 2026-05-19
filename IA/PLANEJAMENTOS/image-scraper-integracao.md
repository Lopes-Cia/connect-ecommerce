# Planejamento (MVP) — Integrar image-scraper no Connect via FloatingAiChat

## Objetivo

Permitir que o Connect dispare o projeto externo `image-scraper` (Node) a partir do `FloatingAiChat`, copiando as imagens resultantes para `connect-ecommerce/public/assets/images/**` para servir no site.

## Abordagem MVP (recomendada)

- Manter o `image-scraper` como projeto externo (fora do build do Next) e executá-lo como CLI.
- No Connect, criar um módulo server-only (“bridge”) que:
  - executa o scraper via `child_process` (Node runtime)
  - aplica timeout e evita execuções concorrentes (lock simples)
  - ao finalizar, copia `image-scraper/data/assets/images/**` para `connect-ecommerce/public/assets/images/**`
  - retorna um resumo (quantidades, paths e eventuais erros)
- Criar uma rota `POST /api/dev/image-scraper/run` (Next Route Handler):
  - `runtime = 'nodejs'`
  - protegida por flag de ambiente (ex.: `IMAGE_SCRAPER_ENABLED=1`) para evitar uso acidental
- No `FloatingAiChat`, adicionar uma ação em “Recursos” para disparar a rota e exibir o resultado no próprio painel.

## Entrada / Saída (MVP)

- Entrada: parâmetros mínimos (ex.: `targetType`, `safe`), e paths resolvidos por configuração (env).
- Saída: resumo com status + local dos arquivos copiados e, opcionalmente, contadores de `not-found`.

## Restrições / Premissas

- Mínimo possível (MVP), sem refactor grande.
- Sem incorporar `crawlee/playwright/sharp` como dependências do Connect.
- Execução somente no servidor (Node), nunca no client.

## Pontos a decidir antes de implementar

- Path do `image-scraper` no ambiente onde o Connect roda:
  - fixo em disco, pasta irmã, ou configurado por env (recomendado: env)
- Quais alvos expor primeiro no chat:
  - apenas `produto` (mais seguro) vs `produto|marca|categoria|banner`
- Trava mínima da rota:
  - apenas flag de env vs flag + token simples
- Retorno para o chat:
  - apenas resumo vs incluir conteúdo de JSONs (pode ser grande)

