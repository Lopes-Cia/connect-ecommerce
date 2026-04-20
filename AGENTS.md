# MDK-ELIS — AGENTS (EntryPoint do Trae Solo)

Este arquivo é o entrypoint de instruções do workspace. Use-o como “roteador”: curto, direto e com links para as definições canônicas.

## Onde está o conteúdo canônico

- Índice geral: [IA/readme.md](file:///c:/LOPES/www/MDK-ELIS/IA/readme.md)
- Regras globais: [INTERACAO.md](file:///c:/LOPES/www/MDK-ELIS/IA/RULES/INTERACAO.md)
- Contrato comum (fonte única de regras compartilhadas): [_CONTRATO.md](file:///c:/LOPES/www/MDK-ELIS/IA/AGENTS/_CONTRATO.md)
- Especialistas:
  - [SEARCHER.md](file:///c:/LOPES/www/MDK-ELIS/IA/AGENTS/SEARCHER.md)
  - [CODER.md](file:///c:/LOPES/www/MDK-ELIS/IA/AGENTS/CODER.md)
  - [DESIGNER.md](file:///c:/LOPES/www/MDK-ELIS/IA/AGENTS/DESIGNER.md)
  - [TESTER.md](file:///c:/LOPES/www/MDK-ELIS/IA/AGENTS/TESTER.md)
  - [QUALITY.md](file:///c:/LOPES/www/MDK-ELIS/IA/AGENTS/QUALITY.md)

## Roteamento (como “linkar” a execução no Trae Solo)

- Pesquisa e repertório (docs, breaking changes, decisões técnicas, descoberta de padrões/skills): usar SEARCHER.
- Implementação (feature/bugfix no stack do repo): usar CODER.
- Revisão e direção visual/UI/UX (hierarquia, tokens, estética, a11y mínima): usar DESIGNER.
- Estratégia e validação de testes (nível mínimo suficiente, matriz de risco, casos): usar TESTER.
- Saúde do projeto (padrões, memória operacional, higiene, evitar regressões): usar QUALITY.

## Artefatos do IDE (onde salvar o que é gerado)

- Specs e checklists gerados durante o trabalho ficam em: `.trae/specs/<slug>/`
  - `spec.md`, `tasks.md`, `checklist.md`
- Templates base (para copiar/derivar) ficam em: `.trae/templates/`
- Guia de estrutura: [.trae/README.md](file:///c:/LOPES/www/MDK-ELIS/.trae/README.md)

## Regra operacional (curta)

- Sempre produzir saída estruturada quando a tarefa for não-trivial: /plan e /spec.
- Se faltar contexto crítico, assumir o caminho mais razoável e registrar a suposição; perguntar apenas quando a decisão mudar a execução de forma relevante.
- Não executar comandos/testes longos por impulso; quando necessário, declarar o que será executado e por quê.
