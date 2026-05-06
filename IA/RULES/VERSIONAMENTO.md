# REGRAS (VERSIONAMENTO E DEPLOY)

## Objetivo
Evitar deploy “fora de sincronia” (branch errada no servidor), reduzir risco operacional e tornar previsível o que está em produção vs desenvolvimento.

## Escopo
Estas regras cobrem:
- Estratégia de branches
- Política de merges/PR
- Versionamento (tags)
- Regras mínimas para deploy (GitHub Actions → VPS)

## Regras
### 1) Branches (contrato)
- `main`: produção. Só entra via PR revisado.
- `develop`: integração/validação. Tudo novo entra primeiro aqui.
- `feature/<nome>`: desenvolvimento de features; sempre merge para `develop`.
- `hotfix/<nome>`: correção urgente iniciada a partir de `main`; merge de volta para `main` e “espelho” para `develop`.

### 1.1) Processo padrão (passo a passo)
- Criar branch de trabalho a partir de `develop` (`feature/<nome>`).
- Implementar e commitar apenas na `feature/<nome>`.
- Abrir PR `feature/<nome>` → `develop`.
- Após validar em `develop`, abrir PR `develop` → `main` para publicar em produção somente quando solicitado explicitamente.
- Após publicar em `main`, sincronizar `develop` com `main` para que ambas apontem para o mesmo commit (fast-forward/`--ff-only`).

### 2) Merges (controle de risco)
- Proibido “deploy direto” por commit manual no servidor.
- Proibido push direto na `main`.
- Toda mudança que impacte deploy precisa de PR e histórico claro (título + descrição curta).
- Nem todo commit em `develop` precisa virar produção: só abrir/mergear PR `develop` → `main` quando solicitado explicitamente.
- Preferir merge commit ou squash (decidir um padrão e manter consistente).

### 3) Tags (versão publicável)
- Tag representa um estado publicável e rastreável.
- Padrão recomendado (já usado no repo): `vYYYY.MM.DD-N` (ex.: `v2026.05.06-1`).
- Criar tag apenas após o merge em `main` (ou em branch de release, se existir).

## Ritual (publicação e deploy)
### 1) Desenvolvimento (sempre)
- Trabalhar sempre a partir de `develop` em `feature/<nome>` (ou `hotfix/<nome>` quando necessário).
- Abrir PR para `develop`.
- Validar em `develop` (testes e smoke manual).

### 2) Preparar produção
- Somente quando solicitado explicitamente, abrir PR `develop` → `main` com descrição curta:
  - O que mudou
  - Risco (baixo/médio/alto) e pontos de atenção
  - Como validar

### 2.1) Atualizar `.env` no VPS (obrigatório antes de produção)
- Antes de fazer merge em `main`, atualizar o `.env` no VPS via SSH (o merge em `main` dispara deploy/produção):
  - `npm run vps:env:push`
  - `npm run vps:env:push:restart` (se quiser reiniciar o PM2 na sequência)

### 3) Publicar (merge em main)
- Fazer merge do PR `develop` → `main` somente quando solicitado explicitamente.

### 4) Validar na main (fluxo CI-like, local)
- Antes de rodar `start`, garantir que não existe `dev` rodando (porta 3000):
  - parar `npm run dev` no terminal (Ctrl+C) ou fechar o processo
- Estar na `main` atualizada, sem comandos destrutivos:
  - `git switch main`
  - `git pull --ff-only origin main`
- Rodar a sequência:
  - `npm ci`
  - `npm run lint`
  - `npm run build`
  - `npm run start`
- Validar no browser se a marcação/alteração esperada aparece.

### 5) Deploy (automático)
- Ao fazer merge/push na branch `main`, o deploy roda automaticamente (production).
- Opcionalmente, também pode ser disparado manualmente (`workflow_dispatch`) sempre a partir da `main`.

### 6) Versionar (tag)
- Após merge em `main`, criar tag `vYYYY.MM.DD-N` apontando para o commit de `main`.

### 3.1) Pós-publicação (obrigatório)
- Atualizar `develop` para ficar exatamente no mesmo commit de `main` (fast-forward/`--ff-only`) e fazer push da `develop`.
  - `git switch develop`
  - `git pull --ff-only origin develop`
  - `git merge --ff-only origin/main`
  - `git push origin develop`

### 4) Deploy (ramo certo no servidor)
- Produção deve sempre refletir `main`.
- Workflow de deploy pode usar `reset --hard` desde que a ref/branch venha do evento que disparou o deploy e seja validada (produção = `main`).
- Se o deploy for manual (`workflow_dispatch`), ele deve bloquear quando a ref não for `main`.

### 5) Ambiente e .env (previsibilidade)
- Fonte única de variáveis: usar apenas **1 arquivo `.env`** (local e servidor). Não usar `.env.secret` / `.env.local` gerados.
- O `.env` **não deve ser versionado** no git (segredos não podem entrar no repositório).
- `.env` no servidor deve ser gerenciado de forma idempotente (substituir o arquivo, não anexar conteúdo repetidamente).
- Segredos nunca podem ser logados.
- Mudanças em variáveis de ambiente são tratadas como mudança de produção: via PR + rastreio.

### 5.1) Atualização do `.env` no VPS (SSH)
- O workflow de deploy **não é responsável** por escrever `.env` a partir de secrets. O `.env` é gerenciado manualmente via SSH/SCP.
- Antes de rodar o deploy (ou quando houver alteração de env), copiar o `.env` local para o VPS e ajustar permissões:
  - Script do projeto (recomendado):
    - `npm run vps:env:push`
    - `npm run vps:env:push:restart` (se quiser reiniciar o PM2 na sequência)
  - Manual (quando necessário):
    - `scp -P 23377 c:\LOPES\www\connect-ecommerce\.env deploy@189.45.246.228:/var/www/connect-ecommerce/.env`
    - `ssh -p 23377 deploy@189.45.246.228 "chmod 600 /var/www/connect-ecommerce/.env"`

## Checklist rápido (antes de publicar)
- Estou publicando o branch correto para o ambiente correto?
- O servidor está puxando exatamente a ref do deploy (sem “branch hardcoded”)?
- Existe tag (ou referência) para rastrear o que está em produção?
- O `.env` no servidor não vai duplicar conteúdo na próxima execução?
- O `.env` do VPS está atualizado (push via SSH) antes do restart do serviço?

