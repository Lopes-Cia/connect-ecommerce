# REGRAS (VERSIONAMENTO E DEPLOY)

## Objetivo
Garantir previsibilidade e segurança:
- Saber exatamente o que está em produção.
- Evitar deploy na branch errada.
- Evitar alterações locais no VPS e “surpresas” em produção.

## Definições
- `main`: produção. Qualquer push/merge aqui é produção.
- `develop`: desenvolvimento/validação.
- Deploy: roda automaticamente quando há push/merge em `main`.
- `.env`: env do app principal (local e VPS). Não é versionado.
- `REDIS/.env`: env do módulo REDIS (local e VPS). Não é versionado. Não misturar com o `.env` da raiz.

## Lei (não negociável)
- Não alteramos direto na `main`. Toda mudança entra primeiro em `develop` (ou `feature/<nome>` → PR → `develop`).
- Existem 2 ações básicas:
  - Commit em `develop` (normal).
  - Merge em `main` (produção): somente quando solicitado explicitamente.
- Se você pedir merge em `main`, a primeira ação é atualizar o `.env` no VPS via SSH (push do arquivo). Só depois seguimos para PR/merge.
- Não fazer commit por qualquer bobagem:
  - Pode commitar sem pedir quando precisar de um ponto de restauração (tarefa complicada).
  - Caso contrário, agrupar mudanças relacionadas e commitar só quando o resultado estiver claro.

## Fluxo 1 — Trabalho normal (dia a dia)
- Trabalhar direto na branch `develop`.
- Implementar e commitar em `develop`.
- Validar em `develop`.
- Observação: branch `feature/*` é opcional e só deve ser usada quando solicitado ou quando a tarefa for grande/arriscada (para isolar mudanças).

## Fluxo 2 — Produção (somente quando solicitado explicitamente)
### Passo 1) Atualizar `.env` no VPS (obrigatório)
- Rodar:
  - `npm run vps:env:push`
  - `npm run vps:env:push:restart` (opcional)

### Pipeline fixo — Quando você disser “faz o deploy”
- Objetivo: sempre repetir o mesmo ritual, sem variação.
- Regra: deploy em produção = merge na `main` (GitHub Actions faz o deploy automático).
- Nota (importante): por segurança, o IDE pode ocultar arquivos `.env` do assistente. Então a “checagem de env” não depende de listar/abrir o arquivo no editor, e sim de validar existência via comando (sem exibir conteúdo).
- Checklist rápido (antes de começar):
  - Você pediu explicitamente “faz o deploy”.
  - `develop` está em dia e validado.
  - `.env` e `REDIS/.env` locais estão atualizados.
- Passos (sempre nesta ordem):
  - 1) Atualizar envs no VPS via SSH:
    - `npm run vps:env:push`
    - Se você pedir restart explícito: `npm run vps:env:push:restart`
  - 2) Abrir PR `develop` → `main` (sem resolver conflito na `main`).
  - 3) Esperar os checks do GitHub Actions ficarem verdes.
  - 4) Fazer merge do PR na `main` (isso dispara o deploy automático).
  - 5) Pós-produção: fast-forward do `develop` para ficar igual à `main` (sem divergência).

### Regra extra — Merge `develop` → `main` (anti-surpresa)
- Nunca fazer merge local para `main`. Produção é sempre via PR `develop` → `main`.
- Se o PR tiver conflito, não resolvemos na `main`:
  - Resolver o conflito em `develop` (ou `feature/*`) e só depois atualizar/reabrir o PR.
  - Objetivo: `main` nunca recebe “hotfix de conflito” direto.
- Antes de abrir o PR `develop` → `main`, garantir que `develop` está atualizado com `origin/main` via fast-forward:
  - Se `--ff-only` falhar, parar e ajustar o `develop` antes de seguir.
- Só fazer merge quando todos os checks do GitHub Actions do PR estiverem verdes.

### Passo 2) Abrir PR `develop` → `main`
- Abrir PR com descrição curta:
  - O que mudou
  - Risco (baixo/médio/alto)
  - Como validar

### Passo 3) Merge em `main`
- Fazer merge do PR `develop` → `main` somente quando solicitado explicitamente.
- Observação: merge/push na `main` dispara produção automaticamente.

### Passo 4) Pós-produção: manter `develop` igual à `main` (obrigatório)
- Garantir fast-forward (sem divergência):
  - `git switch develop`
  - `git pull --ff-only origin develop`
  - `git merge --ff-only origin/main`
  - `git push origin develop`

## Ambiente (.env)
- Fonte única:
  - App principal: usar apenas 1 arquivo `.env` (local e VPS).
  - REDIS: usar apenas 1 arquivo `REDIS/.env` (local e VPS).
- `.env` e `REDIS/.env` não devem ser versionados no git.
- Atualização do `.env`/`REDIS/.env` no VPS é via SSH/SCP, nunca via GitHub secrets.
- Manual (se necessário):
  - `scp -P 23377 c:\LOPES\www\connect-ecommerce\.env deploy@189.45.246.228:/var/www/connect-ecommerce/.env`
  - `ssh -p 23377 deploy@189.45.246.228 "chmod 600 /var/www/connect-ecommerce/.env"`
  - `scp -P 23377 c:\LOPES\www\connect-ecommerce\REDIS\.env deploy@189.45.246.228:/var/www/connect-ecommerce/REDIS/.env`
  - `ssh -p 23377 deploy@189.45.246.228 "chmod 600 /var/www/connect-ecommerce/REDIS/.env"`

## Checklist de produção (antes do merge em main)
- Você pediu explicitamente o merge em `main`?
- O `.env` e o `REDIS/.env` do VPS foram atualizados via SSH?
- O PR `develop` → `main` descreve o que mudou, o risco e como validar?
- Após o merge, o `develop` foi fast-forward para o mesmo commit da `main`?

