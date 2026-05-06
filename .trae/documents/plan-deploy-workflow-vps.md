# Plano — Ajuste do deploy.yml (VPS)

## Resumo
Organizar, passo a passo, o workflow [deploy.yml](file:///c:/LOPES/www/connect-ecommerce/.github/workflows/deploy.yml) para refletir o fluxo manual validado (pull do git, atualização do `.env`, build e restart via pm2), mantendo o deploy somente manual (workflow_dispatch) e com guardrails.

## Estado atual (análise)
- Workflow roda apenas via `workflow_dispatch` e recebe input `environment` (`staging|production`).
- Job `test` executa `npm install`, `npm run lint`, `npm run build`.
- Job `deploy` executa via SSH e faz:
  - `git fetch` + `git reset --hard` (estado atual; será removido pelo ajuste)
  - sobrescreve `.env` via secret `ENV_PROD`
  - remove `node_modules` e `.next`
  - `npm install`, `npm run build`
  - `pm2 restart ... || pm2 start ...`

## Esclarecimento importante (para não ficar “sem sentido”)
- O job `deploy` continua dependente do job `test` (`needs: test`), então **só faz deploy se o `test` passar**.
- Mesmo com `npm run build` rodando no job `test`, ainda precisamos rodar `npm run build` no VPS porque:
  - o build do CI não é enviado como artifact para o servidor (não existe etapa de upload/download),
  - e o VPS precisa do `.next` gerado localmente para servir a aplicação.

## Objetivo (critério de sucesso)
- O workflow documenta e executa exatamente o fluxo “sem lacunas”:
  - Atualizar código no VPS sem comandos destrutivos não aprovados (evitar `reset --hard`).
  - `.env` sempre idempotente (sobrescrever sempre).
  - Dependências: rodar `npm ci` somente quando `package-lock.json` ou `package.json` mudar.
  - Build sempre roda.
  - Restart do serviço usa `pm2 restart connect-ecommerce --update-env` (e fallback para start se não existir).
- Continua sem deploy automático (somente manual).
- `production` só pode rodar a partir da branch `main`.
- Staging/prod apontam para o mesmo VPS por enquanto (environment é “trava/controle”, não muda secrets/host).

## Decisões já fechadas
- **Gatilho**: só manual (workflow_dispatch).
- **Git update no VPS**: `checkout -B` + `pull --ff-only` (sem `reset --hard`).
- **Dependências no VPS**: condicional; quando mudar lock/package → `npm ci`.
- **.env**: sobrescrever sempre.
- **Target**: 1 VPS só (sem staging separado).

## Mudanças propostas (passo a passo)

### Passo 1 — Manter deploy manual e guardrails
Arquivo: [deploy.yml](file:///c:/LOPES/www/connect-ecommerce/.github/workflows/deploy.yml)
- Manter `workflow_dispatch` como único gatilho.
- Manter/confirmar guardrail: se `inputs.environment == production`, exigir `github.ref_name == main`.
- (Opcional de clareza) Renomear textos/labels para refletir “manual” (sem alterar lógica).

### Passo 2 — Alinhar o job de teste ao fluxo CI-like
Arquivo: [deploy.yml](file:///c:/LOPES/www/connect-ecommerce/.github/workflows/deploy.yml)
- Trocar no job `test`:
  - `npm install` → `npm ci`
- Manter `npm run lint` e `npm run build`.
Motivo: reproduzir o fluxo determinístico que estamos validando localmente.

### Passo 3 — Reescrever o script do VPS para o ritual (git + env + deps + build + restart)
Arquivo: [deploy.yml](file:///c:/LOPES/www/connect-ecommerce/.github/workflows/deploy.yml)
Objetivo: espelhar o passo-a-passo do deploy manual (sem reset hard) e tornar o comportamento previsível.

**3.1) Fail-fast**
- Incluir `set -euo pipefail` no início do script remoto para falhar no primeiro erro.

**3.2) Navegar para o diretório do app**
- Manter `cd ${{ secrets.APP_DIR }}` (ou consolidar para `/var/www/connect-ecommerce` se quiser padronizar; por enquanto manter secret).

**3.3) Git update sem reset hard (checkout -B + ff-only)**
- Capturar commit anterior:
  - `PREV="$(git rev-parse HEAD)"`
- Atualizar branch alvo (a branch que disparou o workflow):
  - `BRANCH="${{ github.ref_name }}"`
  - `git fetch origin "$BRANCH"`
  - `git checkout -B "$BRANCH" "origin/$BRANCH"`
  - `git pull --ff-only origin "$BRANCH"`

**3.4) Atualizar .env (sempre)**
- Sobrescrever o `.env` usando secret:
  - `cat > .env <<'EOF' ... EOF`
  - `chmod 600 .env`

**3.5) Dependências condicional (npm ci apenas se necessário)**
- Após atualizar para o novo HEAD, comparar mudanças entre `$PREV` e `HEAD`:
  - Se `package-lock.json` ou `package.json` mudou → `npm ci`
  - Caso contrário → não roda install.

**3.6) Build sempre**
- Remover `.next` para evitar resíduo e rodar build:
  - `rm -rf .next`
  - `npm run build`

**3.7) Restart via pm2 com update-env**
- Preferir:
  - `pm2 restart connect-ecommerce --update-env`
- Fallback somente para “processo não existe”:
  - `pm2 start npm --name "connect-ecommerce" -- start -- -p 3000`
- `pm2 save`

### Passo 4 — Ajustar documentação operacional (opcional, mas recomendado)
Arquivo: [VERSIONAMENTO.md](file:///c:/LOPES/www/connect-ecommerce/IA/RULES/VERSIONAMENTO.md)
- Garantir que o ritual “deploy manual” cite explicitamente:
  - parada de `dev` antes de `start`
  - `git pull --ff-only` na `main` para validar localmente
  - pós-publicação: fast-forward da `develop` para a `main`
Observação: já existe, mas revisar para manter coerência com o que ficar no workflow.

## Verificação (após implementar)
- Checar se o YAML está válido (abrir o arquivo e revisar indentação/inputs).
- Confirmar que o workflow aparece no GitHub Actions com `workflow_dispatch` e input `environment`.
- Rodar localmente (para simular a etapa de teste):
  - `npm ci`
  - `npm run lint` (aceitar warnings existentes, sem erros)
  - `npm run build`
- No VPS (via workflow manual), observar o log do passo SSH:
  - Verificar que não usa `reset --hard`
  - Verificar que `.env` foi sobrescrito
  - Verificar se `npm ci` só roda quando lock/package muda
  - Verificar `pm2 restart ... --update-env`

## Riscos e como mitigamos
- **Repo no VPS com mudanças locais**: `ff-only` falha. Mitigação: falha explícita e exige correção manual (não forçar `reset --hard`).
- **Dependências desatualizadas**: se lock/package não muda mas node_modules está inconsistente, build pode falhar. Mitigação: o build falha e sinaliza; a correção é rodar `npm ci` manualmente (não automatizar força sem aprovação).
