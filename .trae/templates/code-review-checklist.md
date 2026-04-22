# Checklist — Code Review

- [ ] P0: build/runtime não quebra; não vaza segredo/dado sensível.
- [ ] P0: mudanças em auth/pagamento/fluxo crítico têm validação clara.
- [ ] P1: boundaries claros (entrada/saída), sem casts “pra compilar”.
- [ ] P1: naming descritivo e consistente; sem duplicação óbvia.
- [ ] P1: estados de UI cobertos quando aplicável (loading/empty/error).
- [ ] P2: limpeza de imports/arquivos; docs mínimas quando criar “módulo”.

