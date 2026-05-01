# Tasks — Registro de Usuário (ERP + Auth)

## Fase 0 — Preparação

1) Ler e consolidar as notas existentes:
   - `IA/notas_cadastro_contexto.md`
   - `IA/padrao_dev_testes_endpoints.md`
   - contratos existentes em `liz_refator/contracts/lopes/*`

## Fase 1 — DEV/RAW do Auth (passo a passo)

2) Ajustar config/env para suportar a base do Auth indicada no `.env` (ex.: `BACK_AUTH_BASE_URL`) sem permitir sobrescrita via UI.
3) Criar rotas tipadas do Auth em `liz_refator/integration/integrationRoutes.ts` (ex.: `AUTH_API_ROUTES`).
4) Implementar client RAW para Auth (base `AUTH_BASE_URL`/`BACK_AUTH_BASE_URL`) seguindo o mesmo padrão dos RAW clients atuais:
   - GET com query e `idIntegradora` injetado server-side quando aplicável
   - POST com `Authorization` redigido no retorno ao browser
5) Criar handlers DEV:
   - `GET /api/dev/liz-refator/raw/auth/get-vinculo-usuario-site`
   - `POST /api/dev/liz-refator/raw/auth/insert-operador-sistema`
   - `GET /api/dev/liz-refator/raw/auth/get-operador-sistema`
   - `POST /api/dev/liz-refator/raw/auth/insert-vinculo-usuario-site`
6) Criar UI DEV do Auth (nova página) com cards para cada passo, reutilizando o JSON de cliente de teste como default (email/cnpj/whatsapp/nome).
7) Testar no navegador cada card e salvar screenshots/JSON Response para consolidar contrato.

## Fase 2 — Documentação do fluxo

8) Atualizar `c:\LOPES\FILES\fluxo_registro_usuario.md`:
   - Completar o passo 2.1 com body real (conforme retorno real testado)
   - Incluir validação de vínculo no início e no fim do fluxo
   - Indicar explicitamente a variável `.env` usada na base do Auth (a que estiver indicada no doc)

## Fase 3 — Rota única (orquestração)

9) Implementar endpoint server-side de registro unificado:
   - Validação inicial: `getVinculoUsuarioSite` (early success se já existe)
   - ERP: garantir cliente (`getClienteLoja` + `insertClienteLoja` quando necessário)
   - Auth: operador + vínculo + validação final
10) Adicionar card DEV para “Registro unificado” (para validação manual rápida).

## Fase 4 — Integração no /register

11) Integrar a rota única na página de register:
   - Manter UX atual
   - Substituir a chamada atual pelo endpoint unificado
12) Validar no navegador:
   - Cliente sem vínculo → fluxo completo
   - Cliente com vínculo → validação inicial evita repetir

