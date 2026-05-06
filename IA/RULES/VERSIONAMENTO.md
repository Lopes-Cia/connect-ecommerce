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
- Após validar em `develop`, abrir PR `develop` → `main` para publicar em produção.
- Após publicar em `main`, sincronizar `develop` com `main` para que ambas apontem para o mesmo commit (fast-forward/`--ff-only`).

### 2) Merges (controle de risco)
- Proibido “deploy direto” por commit manual no servidor.
- Proibido push direto na `main`.
- Toda mudança que impacte deploy precisa de PR e histórico claro (título + descrição curta).
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
- Abrir PR `develop` → `main` com descrição curta:
  - O que mudou
  - Risco (baixo/médio/alto) e pontos de atenção
  - Como validar

### 3) Publicar
- Após merge em `main`, criar tag `vYYYY.MM.DD-N` apontando para o commit de `main`.
- Rodar o deploy manualmente informando o ambiente:
  - `staging` para publicar `develop`
  - `production` para publicar `main`

### 3.1) Pós-publicação (obrigatório)
- Atualizar `develop` para ficar exatamente no mesmo commit de `main` (fast-forward/`--ff-only`) e fazer push da `develop`.

### 4) Deploy (ramo certo no servidor)
- Produção deve sempre refletir `main`.
- Se existir “staging”, ele deve refletir `develop`.
- Workflow de deploy nunca deve “forçar” branch fixa no servidor (ex.: `git reset --hard origin/main`) sem validar qual ref disparou o deploy.
- Se o deploy for manual (`workflow_dispatch`), ele deve exigir seleção explícita do ambiente e bloquear produção quando a ref não for `main`.

### 5) Ambiente e .env (previsibilidade)
- `.env` no servidor deve ser gerenciado de forma idempotente (não anexar conteúdo repetidamente).
- Segredos nunca podem ser logados.
- Mudanças em variáveis de ambiente são tratadas como mudança de produção: via PR + rastreio.

## Checklist rápido (antes de publicar)
- Estou publicando o branch correto para o ambiente correto?
- O servidor está puxando exatamente a ref do deploy (sem “branch hardcoded”)?
- Existe tag (ou referência) para rastrear o que está em produção?
- O `.env` no servidor não vai duplicar conteúdo na próxima execução?

