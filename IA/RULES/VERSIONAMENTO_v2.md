# REGRAS (VERSIONAMENTO E DEPLOY) — v2 (IA-first)

> Documento executável (contrato) do ritual “faz o deploy”.
> Fonte de decisões: `c:\LOPES\www\connect-ecommerce\.trae\specs\deploy-uniforme\checklist.md`
> Contrato de execução: `c:\LOPES\www\connect-ecommerce\.github\workflows\deploy.yml`

## 1) Objetivo

- Deploy como ritual confiável e constante, sem variação entre chats/sessões.
- “Faz o deploy” não é interpretado: mapeia para um comando fixo (`npm run deploy`) e executa sempre o mesmo fluxo.

## 2) Governança (fonte de verdade)

- Esta v2 é o contrato do ritual “faz o deploy”.
- `c:\LOPES\www\connect-ecommerce\IA\RULES\VERSIONAMENTO.md` é legado e não rege o ritual novo.
- Qualquer mudança no ritual acontece via atualização do `checklist.md` e depois atualização desta v2.

## 3) Contrato do deploy em produção (GitHub Actions)

Arquivo: `c:\LOPES\www\connect-ecommerce\.github\workflows\deploy.yml`

O que o `deploy.yml` faz (contrato operacional):
- Produção roda em `push` na `main` (e também pode ser disparado por `workflow_dispatch`).
- Antes de deploy, existe um job de validação que roda: `npm ci` → `npm run lint` → `npm run build` (e instala dependências em `MICROSERVICES/*` e `REDIS` conforme o workflow).
- O job de deploy tem gate de branch e falha se não for `main`.
- No VPS, o deploy:
  - sincroniza o código via git (reset/clean) na branch `main`
  - falha cedo se `.env` estiver ausente e aplica `chmod 600 .env`
  - valida `REDIS/.env` quando aplicável no workflow atual e aplica `chmod 600`
  - roda `npm run build` e faz restart do processo via `pm2`

Nota de alinhamento (v2):
- Para o ritual novo, `.env` e `REDIS/.env` são invariantes (existem e ponto final). O `deploy.yml` será ajustado para refletir isso sem condicionais.

## 4) Comando do ritual (interface única)

- Frase gatilho: “faz o deploy”
- Comando: `npm run deploy`
- Interação permitida: somente o checkpoint do merge (sim/não) após checks verdes.

## 5) Fluxo fixo (ordem não muda)

1) Guardrails (strict, fail-fast):
   - branch atual deve ser `develop`
   - working tree deve estar limpa
   - `develop` deve conter `origin/main` (anti-surpresa)
   - ferramentas obrigatórias devem existir: `pwsh`, `git`, `npm`, `ssh`, `scp`, `gh`
   - `gh` deve estar autenticado sem browser/device flow (se falhar, aborta)
   - SSH deve funcionar (pré-requisito mínimo do VPS)

2) Atualizar env no VPS (obrigatório, sempre antes de PR/merge):
   - `npm run vps:env:push`

3) PR (sempre via PR, nunca merge local direto na `main`):
   - se existir PR `develop → main` aberto: fechar e criar um novo PR

4) Checks:
   - esperar até ficar verde
   - se falhar: abortar e fechar PR (comentário curto padrão)

5) Merge (gate humano em fluxo):
   - quando os checks estiverem verdes, perguntar: “Merge pronto para executar via gh. Aprova? (sim/não)”
   - se “sim”: executar merge via `gh` e continuar
   - se “não”: encerrar sem merge

6) Pós-produção (obrigatório):
   - fast-forward automático do `develop` para igualar `main`
   - se falhar: abortar, mantendo/mostrando referências do PR/estado

## 6) Política de correção (sempre em develop)

- Correção nunca é feita em produção.
- Se PR falhou e ficou aberto: fechar PR, aplicar correção em `develop`, recriar PR e reexecutar o ritual.

## 7) Mensagens de falha (imprimir só o motivo)

- branch errada → `FAIL: branch != develop`
- working tree suja → `Mudanças locais`
- anti-surpresa (`develop` não contém `origin/main`) → `Develop desatualizado`
- env ausente (local/VPS) → `Env ausente`
- SSH indisponível → `ssh indisponível`
- gh indisponível/auth inválida → `gh indisponível/auth inválida`
- checks não verdes → `Checks falharam`
- PR com conflito → `Merge conflito`
- falha ao fechar PR automaticamente → `Falha fechar PR`
- pós-produção fast-forward falhou → `Develop divergiu`

## 8) Protocolo de testes do ritual (para considerar “pronto”)

- Critério: 3 execuções seguidas sem surpresa.
- Read-only (zero side-effects): completo (branch develop, working tree limpa, fetch/ff-only, develop contém origin/main, gh auth ok, ssh ok). Não verificar existência local de `.env`/`REDIS/.env`.
- Execução 1 e 2 (side-effect controlado): fechar/criar PR + esperar checks verdes + parar no gate (sem merge).
- Execução 3: merge real na `main` permitido apenas após aprovação no gate (sim/não).
