# REGRAS (PAINEL MVP E MIGRAÇÃO CONTROLADA)

## Objetivo

Evitar refatoração ampla e prematura quando o contexto for:

- prazo curto
- necessidade de entrega concreta em estilo MVP
- existência de um painel administrativo novo
- funções que hoje vivem no ecommerce, mas tendem a fazer mais sentido em admin/back-end

Esta regra existe para orientar o comportamento da IA nesses casos.

## Princípio central

Quando o prazo for curto, a IA deve priorizar:

- entrega concreta
- risco baixo
- reaproveitamento do que já funciona
- validação incremental

E deve evitar, por padrão:

- migração ampla entre projetos
- extração precoce para outro repositório
- redesenho arquitetural grande sem necessidade imediata

## Regra de decisão

Se uma função hoje já existe neste projeto e funciona, a IA deve considerar como estratégia válida de curto prazo:

- manter a implementação aqui
- permitir que o painel consuma essa função a partir daqui
- tratar isso como solução de entrega
- não tratar isso automaticamente como arquitetura final

## Processo preferido

Quando o usuário estiver migrando capacidades para o painel, a IA deve preferir este fluxo:

1. escolher uma função simples
2. implementar um consumo real dessa função pelo painel
3. marcar claramente que isso faz parte de uma migração para painel
4. validar o comportamento real
5. consolidar um padrão mínimo e repetível
6. só depois discutir ampliação para outros casos

## O que a IA deve fazer

- preferir cortes pequenos, reversíveis e testáveis
- sugerir pilotos controlados em vez de migração em massa
- separar claramente:
  - o que é decisão de prazo
  - o que seria arquitetura final
- preservar compatibilidade com o que já funciona
- registrar contexto e decisões em arquivo para não depender da memória do chat
- pedir aprovação do usuário antes de expandir um piloto para uma estratégia mais ampla

## O que a IA não deve fazer por padrão

- não propor mover tudo para outro projeto/repositório logo no início
- não assumir que uma responsabilidade "deveria estar no painel" implica migração imediata do código
- não transformar um caso piloto em plano geral sem validação real
- não abrir macro tarefa de arquitetura quando o usuário estiver tentando ganhar tempo de entrega
- não gastar tempo criando complexidade antes de provar um padrão simples

## Leitura correta dessa estratégia

Esta estratégia deve ser tratada como:

- uma solução pragmática de curto prazo
- uma forma de ganhar tempo com segurança
- um experimento controlado para definir padrão

Ela não deve ser tratada automaticamente como:

- desenho final da arquitetura
- separação definitiva entre ecommerce e painel
- justificativa para continuar misturando responsabilidades sem controle

## Critério de coerência

Se o piloto:

- entrega valor concreto rápido
- não quebra o core do ecommerce
- permite ao painel consumir a função com clareza
- gera um padrão que pode ser repetido

então a estratégia continua coerente.

Se o piloto:

- aumenta a confusão entre vitrine e admin
- espalha novas responsabilidades sem critério
- exige muito improviso a cada novo caso
- impede separação futura

então a estratégia perdeu coerência e precisa ser revista.

## Regra de comunicação

Nessas tarefas, a IA deve:

- manter resposta objetiva
- mostrar claramente o estado atual
- distinguir fato, hipótese e sugestão
- explicitar trade-off entre prazo e arquitetura
- lembrar que a decisão final é do usuário

## Frase de referência

Quando houver dúvida, usar esta leitura-base:

> em contexto de prazo curto, a IA deve preferir piloto pequeno, reaproveitamento do que já funciona e validação real antes de qualquer migração ampla para o painel
