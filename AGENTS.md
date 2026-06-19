Vamos implentar alguns recursos dno projeto, faça de forma simplificada e minimalista  (estilo MVP), 
O uso de fallback, compatibilidade com codigo legado. Me mostre chat a situação , e eu aprovo ou nao  (tem que ser via chat pois se ficar dentro de um spec ou plan pode passar despercebido)
A regra que vamos seguir tem ser muito clara, Quem tomas as decisões sou EU, vc tem direito de sugerir, mas tem que ser minimalista, nao gaste tempo criando complexidade pra uma situação que eu posso nem aprovar

nunca rode npm run dev , esse comando quem executa sou eu , a menos que eu diga para vc rodar

por padrao execute somente a validação da sintaxe do script (lint), execute a build somente se for uma ação complexa, pequenas ações nao é necessario


# connect-ecommerce — AGENTS (EntryPoint do Trae Solo)

Este arquivo é o entrypoint de instruções do workspace. Use-o como “roteador”: curto, direto e com links para as definições canônicas.

## Onde está o conteúdo canônico

- Índice geral: [IA/readme.md](file:///c:/LOPES/www/connect-ecommerce/IA/readme.md)
- Regras globais: [INTERACAO.md](file:///c:/LOPES/www/connect-ecommerce/IA/RULES/INTERACAO.md)
- Regra canônica para migração MVP ao painel (ler quando o tema envolver painel/admin, reaproveitamento do front e prazo curto): [PAINEL_MVP.md](file:///c:/LOPES/www/connect-ecommerce/IA/RULES/PAINEL_MVP.md)
- Regras de versionamento e deploy (obrigatório ler antes de atuar): [VERSIONAMENTO.md](file:///c:/LOPES/www/connect-ecommerce/IA/RULES/VERSIONAMENTO.md)
- Contrato comum (fonte única de regras compartilhadas): [_CONTRATO.md](file:///c:/LOPES/www/connect-ecommerce/IA/AGENTS/_CONTRATO.md)
- Especialistas:
  - [SEARCHER.md](file:///c:/LOPES/www/connect-ecommerce/IA/AGENTS/SEARCHER.md)
  - [CODER.md](file:///c:/LOPES/www/connect-ecommerce/IA/AGENTS/CODER.md)
  - [DESIGNER.md](file:///c:/LOPES/www/connect-ecommerce/IA/AGENTS/DESIGNER.md)
  - [TESTER.md](file:///c:/LOPES/www/connect-ecommerce/IA/AGENTS/TESTER.md)
  - [QUALITY.md](file:///c:/LOPES/www/connect-ecommerce/IA/AGENTS/QUALITY.md)

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
- Guia de estrutura: [.trae/README.md](file:///c:/LOPES/www/connect-ecommerce/.trae/README.md)

## Regra operacional (curta)

- Sempre produzir saída estruturada quando a tarefa for não-trivial: /plan e /spec.
- Se faltar contexto crítico, assumir o caminho mais razoável e registrar a suposição; perguntar apenas quando a decisão mudar a execução de forma relevante.
- Não executar comandos/testes longos por impulso; quando necessário, declarar o que será executado e por quê.
- Quando o tema envolver migração para painel/admin com prazo curto, seguir a regra canônica `IA/RULES/PAINEL_MVP.md`.
- Nesses casos, a IA deve preferir piloto pequeno e validável, sem propor por padrão migração ampla para outro projeto/repositório.
- Quem decide o corte e a ordem é o usuário; a IA sugere apenas caminhos minimalistas e testáveis.




PRESCISO EXECUTAR UMA CORREÇÃO CRITICA, quero que essa tarefa seja feita com cuidado e com segurança.
