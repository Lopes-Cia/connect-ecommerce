# Plano — AIChat: rebuild UI minimalista

## Resumo

Refatorar a interface do componente [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx) para um MVP: remover toda a navegação lateral, menus, “atalhos”, e as áreas “Produtos/Home” (e suas views). Manter apenas o chat básico (mensagens + input + enviar) com abrir/fechar.

## Estado atual (análise)

- O componente tem múltiplas “views” (`activeView`) e um menu lateral com grupos “Produtos” e “Home”, além de um menu mobile (Dialog).
- Existem botões de header e toggles que você marcou para remoção (“Nova conversa”, “Produtos”, “Home”).
- As views avançadas usam componentes:
  - `ErpSection`, `RedisSection`, `RedisCategoriesSection`.
- O chat principal já existe e usa `/api/ai/brand-assistant` enviando `message` + `productContext`.

## Decisões já confirmadas (via chat)

- Remover os grupos “Produtos” e “Home” e tudo relacionado, inclusive no menu mobile.
- “Remover tudo… vamos recriar a ferramenta”: interface vai ficar só no chat básico (sem atalhos/menus/views).

## Mudanças propostas (arquivos e como)

### 1) Simplificar `FloatingAiChat.tsx` para “chat only”

- **Editar**: `components/ai/FloatingAiChat.tsx`
- Remover da UI:
  - Botão “Nova conversa” do header.
  - Botão/toggle do grupo “Produtos” + todas as opções internas.
  - Botão/toggle do grupo “Home” + todas as opções internas.
  - Menu lateral inteiro (sidebar) e botão de recolher/expandir.
  - View “Atalhos” e os botões de atalho dentro do conteúdo.
  - Dialog de menu mobile inteiro (incluindo botão “Abrir menu”).
- Remover do estado local do componente:
  - `activeView`, `mobileMenuOpen`, `sidebarCollapsed`, `produtosOpen`, `homeOpen`.
  - Qualquer função auxiliar só usada por esses menus (ex.: `getActiveViewLabel`, `getNavButtonClass`, `getNavIconClass`, `closeMobileMenu`, `resetConversation` se não existir mais botão que use).
- Remover imports que deixam de ser usados:
  - Ícones: `Boxes`, `ChevronDown`, `Image as ImageIcon`, `Layers`, `List`, `Menu`, `MessageSquare`, `PanelLeftClose`, `PanelLeftOpen`, `Tags`, `Zap`.
  - Seções: `ErpSection`, `RedisSection`, `RedisCategoriesSection`.
  - Componentes UI: `Dialog*` (se removermos o menu mobile), e quaisquer `Button` de atalhos que deixarem de existir.
- Manter:
  - Gate do AIChat via `IASTORE.aiChatEnabled` (já está no componente).
  - Overlay, abrir/fechar (botão flutuante e botão “✕” para fechar o painel).
  - Área de mensagens, input e botão “Enviar”.
  - Envio para `/api/ai/brand-assistant` (sem mudar backend agora).

### 2) Ajustes de UX mínimos (sem inventar features)

- Header: manter só título/subtítulo e botão “✕”.
- Conteúdo: sempre renderizar o chat (sem depender de `activeView`).

## Critérios de aceite

- UI do AIChat não exibe mais botões/menus “Produtos”, “Home” e “Nova”.
- Não há mais referências a `ErpSection`, `RedisSection`, `RedisCategoriesSection` no componente.
- `npm run build` passa.

## Verificação

1. `npm run lint` (esperado: warnings já existentes podem permanecer, mas sem novos erros).
2. `npm run build`.
3. Validação manual:
   - AIChat abre/fecha.
   - Enviar mensagem funciona.
   - Não existe menu lateral nem menu mobile.

