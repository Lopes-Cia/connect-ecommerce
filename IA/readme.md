# IA (TIME)

Modelo para compartilhar entre projetos e time: definições de especialistas, regras, formatos de entrega (plan/spec) e convenções de artefatos do Trae Solo.

## Índice
- Especialistas: [SEARCHER](#specialists-searcher), [CODER](#specialists-coder), [DESIGNER](#specialists-designer), [TESTER](#specialists-tester), [QUALITY](#specialists-quality)
- Regras: [INTERAÇÃO](#rules-interacao)
- TODO: [CODER](#todo-pesquisa-parruda--reuso-por-delta---coder), [DESIGNER](#todo-pesquisa-parruda--reuso-por-delta---designer), [TESTER](#todo-pesquisa-parruda--reuso-por-delta---tester), [QUALITY](#todo-pesquisa-parruda--reuso-por-delta---quality)


## Como o Trae Solo usa isso

- EntryPoint do workspace: `AGENTS.md` (na raiz do repo). Ele roteia para este índice e para os especialistas/regras.
- Conteúdo canônico vive em `IA/`:
  - `IA/AGENTS/*` (especialistas)
  - `IA/RULES/*` (regras)
- Artefatos gerados durante o trabalho (specs, tasks, checklists) vivem em `.trae/specs/*`.

## Especialistas (melhorias sobre o padrão do IDE)

O Trae já possui agentes especializados, mas estes arquivos padronizam:
- Quando acionar cada especialista
- Formato obrigatório de entrega (/plan e /spec quando não-trivial)
- Reuso de pesquisa via `.trae/specs/` (evitar repetir pesquisa)

<a id="specialists-searcher"></a>
## SEARCHER

Definição completa em: [AGENTS/SEARCHER.md](./AGENTS/SEARCHER.md)




<a id="specialists-coder"></a>
## CODER

Definição completa em: [AGENTS/CODER.md](./AGENTS/CODER.md)



<a id="specialists-designer"></a>
## DESIGNER

Definição completa em: [AGENTS/DESIGNER.md](./AGENTS/DESIGNER.md)

<a id="specialists-tester"></a>
## TESTER

Definição completa em: [AGENTS/TESTER.md](./AGENTS/TESTER.md)

<a id="specialists-quality"></a>
## QUALITY

Definição completa em: [AGENTS/QUALITY.md](./AGENTS/QUALITY.md)

<a id="rules-interacao"></a>
## REGRAS

Definição completa em: [RULES/INTERACAO.md](./RULES/INTERACAO.md)

## TODO (Pesquisa parruda + reuso por delta - CODER)
- [x] Spec baseline criada: `.trae/specs/research-coder-stack/` (spec.md + tasks.md + checklist.md)
- [ ] Quando houver tarefa real com dúvida de API/versão/breaking change: gerar DELTA via SEARCHER e registrar em `.trae/specs/`.

## TODO (Pesquisa parruda + reuso por delta - DESIGNER)
- [x] Spec baseline criada: `.trae/specs/research-designer-foundations-and-patterns/` (spec.md + tasks.md + checklist.md)
- [ ] Quando surgir biblioteca de UI/blocks ou guideline específica: gerar DELTA via SEARCHER.

## TODO (Pesquisa parruda + reuso por delta - TESTER)
- [x] Spec baseline criada: `.trae/specs/research-tester-strategy-and-tooling/` (spec.md + tasks.md + checklist.md)
- [ ] Quando o projeto definir tooling (runner/e2e/api/perf): gerar DELTA via SEARCHER.

## TODO (Pesquisa parruda + reuso por delta - QUALITY)
- [x] Spec baseline criada: `.trae/specs/research-quality-memory-hygiene/` (spec.md + tasks.md + checklist.md)
- [ ] Quando houver refactor grande ou padrão novo: gerar DELTA via SEARCHER e registrar.
