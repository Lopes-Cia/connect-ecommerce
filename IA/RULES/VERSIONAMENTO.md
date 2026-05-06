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
- `.env`: fonte única de variáveis (local e VPS). Não é versionado.

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
- Criar branch a partir de `develop`: `feature/<nome>`.
- Implementar e commitar na `feature/<nome>`.
- Abrir PR `feature/<nome>` → `develop`.
- Validar em `develop`.

## Fluxo 2 — Produção (somente quando solicitado explicitamente)
### Passo 1) Atualizar `.env` no VPS (obrigatório)
- Rodar:
  - `npm run vps:env:push`
  - `npm run vps:env:push:restart` (opcional)

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
- Fonte única: usar apenas 1 arquivo `.env` (local e VPS).
- `.env` não deve ser versionado no git.
- Atualização do `.env` no VPS é via SSH/SCP, nunca via GitHub secrets.
- Manual (se necessário):
  - `scp -P 23377 c:\LOPES\www\connect-ecommerce\.env deploy@189.45.246.228:/var/www/connect-ecommerce/.env`
  - `ssh -p 23377 deploy@189.45.246.228 "chmod 600 /var/www/connect-ecommerce/.env"`

## Checklist de produção (antes do merge em main)
- Você pediu explicitamente o merge em `main`?
- O `.env` do VPS foi atualizado via SSH?
- O PR `develop` → `main` descreve o que mudou, o risco e como validar?
- Após o merge, o `develop` foi fast-forward para o mesmo commit da `main`?

