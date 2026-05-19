# Plano — AIChat: layout + menu (Chat/Recursos)

## Resumo

Ajustar o painel do AIChat (aberto) para ocupar a altura disponível com margem superior e inferior de 80px, e reintroduzir uma barra de menu à esquerda com 2 itens: **Chat** e **Recursos** (ambos com ícone + texto).

## Estado atual (análise)

- O AIChat está montado via wrapper client-only [AiChatMount.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/AiChatMount.tsx) para evitar mismatch de hidratação.
- O componente [FloatingAiChat.tsx](file:///c:/LOPES/www/connect-ecommerce/components/ai/FloatingAiChat.tsx) está no formato “chat only” (sem sidebar).
- O painel aberto hoje usa container `relative ... h-[min(88vh,860px)] ... md:w-[520px]` e fica posicionado por conta do wrapper `fixed bottom-5 right-5`.

## Decisões confirmadas

- Margem top e bottom de **80px** é para o painel aberto.
- Botão flutuante “IA” continua como hoje (canto inferior direito).

## Mudanças propostas

### 1) Painel aberto: altura total com margem de 80px

- **Editar**: `components/ai/FloatingAiChat.tsx`
- Trocar layout do painel aberto de `relative + height min()` para `fixed` com:
  - `top-20 bottom-20 right-5` (80px = `20` no Tailwind)
  - largura desktop mantida (`md:w-[520px]`) e mobile com `w-[calc(100vw-24px)]`
  - altura passa a ser “toda disponível” via `top/bottom` + `min-h-0` nos filhos.
- Manter overlay (`fixed inset-0`) como está.

### 2) Reintroduzir barra lateral (menu) minimalista

- **Editar**: `components/ai/FloatingAiChat.tsx`
- Reintroduzir estado simples:
  - `activeTab: "chat" | "recursos"` (default `"chat"`)
- Layout interno do painel:
  - `div` raiz do conteúdo com `flex min-h-0 flex-1`
  - Sidebar esquerda (sempre visível no desktop e no mobile também, para manter simples) com:
    - largura fixa (proposta: `w-44` ou `w-48`)
    - itens: `Chat` e `Recursos`
    - cada item: `button` com ícone + texto, e estilo ativo/inativo.
- Ícones:
  - Usar `lucide-react` (já existe no projeto), sugestão:
    - `MessageSquare` para Chat
    - `Sparkles` (ou `Zap`) para Recursos

### 3) Conteúdo por aba

- **Chat**: manter exatamente o chat atual (mensagens + input + enviar).
- **Recursos**: placeholder MVP (sem chamar APIs), por exemplo:
  - card/box com texto “Em construção” e espaço para evoluir depois.

## Critérios de aceite

- Painel aberto do AIChat respeita `top: 80px` e `bottom: 80px`, e usa toda altura disponível.
- Sidebar aparece com 2 itens (ícone + texto): Chat e Recursos, alternando o conteúdo.
- Não reintroduz “Produtos/Home/Atalhos” antigos.
- `npm run build` passa.

## Verificação

1. `npm run lint` (sem novos erros).
2. `npm run build`.
3. Validação manual (por você):
   - Abrir o AIChat e confirmar o painel com margem 80px em cima/baixo.
   - Trocar entre Chat/Recursos e validar que o chat continua enviando mensagens.

