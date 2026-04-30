# Checklist — Registro de Usuário (ERP + Auth)

## Segurança / Contratos

- [ ] `Authorization` sempre redigido no JSON de resposta para o browser (`"<redacted>"`).
- [ ] `idIntegradora` vem sempre do `.env` no server (query/body do client não sobrescreve).
- [ ] Aceitar retorno `true` e `"true"` para POSTs que usam esse padrão.
- [ ] Tratar `codCli=0` como possível e não como erro.

## DEV/RAW (Auth)

- [ ] Card `getVinculoUsuarioSite (início)` executa e mostra contrato do retorno.
- [ ] Card `insertOperadorSistema` executa e mostra contrato do retorno.
- [ ] Card `getOperadorSistema` executa e extrai `idUsuario` corretamente.
- [ ] Card `insertVinculoUsuarioSite` executa e mostra contrato do retorno.
- [ ] Card `getVinculoUsuarioSite (fim)` confirma vínculo criado.

## Documentação

- [ ] `c:\LOPES\FILES\fluxo_registro_usuario.md` atualizado:
  - [ ] passo 2.1 completo com body real e observações necessárias
  - [ ] validação de vínculo no início e no fim
  - [ ] variável `.env` correta para base do Auth

## Registro Unificado

- [ ] Endpoint unificado retorna `alreadyLinked=true` quando vínculo já existe (não repete fluxo).
- [ ] Quando vínculo não existe, endpoint unificado cria tudo e valida no fim.
- [ ] Card DEV do registro unificado funciona para teste rápido.

## /register

- [ ] `/register` usa endpoint unificado sem quebrar UX atual.
- [ ] Cadastro “novo” funciona.
- [ ] Cadastro “já vinculado” não repete operações desnecessárias e responde corretamente.

