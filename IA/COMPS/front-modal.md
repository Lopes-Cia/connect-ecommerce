# Front Modal (Dialog global)

Este projeto possui um **modal global** (Dialog) para cenários de:
- Erro, sucesso, atenção
- Confirmação (sim/não)
- Escolha única
- Escolha múltipla

Ele é **acessível em qualquer página client** e funciona por **Promise**.

## Import

```ts
import { frontModal } from "@/stores/front-modal-store"
```

## Contratos (retorno)

```ts
frontModal.success(input): Promise<void>
frontModal.error(input): Promise<void>
frontModal.warning(input): Promise<void>

frontModal.confirm(input): Promise<boolean>
frontModal.chooseOne(input): Promise<string | null>
frontModal.chooseMany(input): Promise<string[]>

frontModal.close(): void
```

Cancelamentos (ESC / clique fora / substituição por outro dialog):
- `confirm` -> `false`
- `chooseOne` -> `null`
- `chooseMany` -> `[]`
- informativos -> `void`

## Exemplos (copy/paste)

### Sucesso

```ts
await frontModal.success({
  title: "Dados salvos",
  description: "Suas informações foram atualizadas com sucesso.",
})
```

### Erro

```ts
await frontModal.error({
  title: "Falha ao salvar",
  description: "Tente novamente em instantes.",
})
```

### Atenção

```ts
await frontModal.warning({
  title: "Atenção",
  description: "Você tem alterações não salvas.",
})
```

### Confirmar (sim/não)

```ts
const ok = await frontModal.confirm({
  title: "Excluir endereço?",
  description: "Esta ação não pode ser desfeita.",
  confirmText: "Sim, excluir",
  cancelText: "Não",
  confirmVariant: "destructive",
})

if (!ok) return
```

### Navegar após confirmar (padrão comum)

```ts
const ok = await frontModal.confirm({
  title: "Ir para o checkout?",
  description: "Você será redirecionado agora.",
  hrefOnConfirm: "/checkout",
})
```

### Escolha única (retorna `id` ou `null`)

```ts
const id = await frontModal.chooseOne({
  title: "Escolha uma forma de entrega",
  options: [
    { id: "retirada", label: "Retirada", description: "Buscar na loja" },
    { id: "motoboy", label: "Motoboy", description: "Entrega no mesmo dia" },
  ],
  defaultValue: "retirada",
})

if (!id) return
```

### Escolha múltipla (retorna `string[]`)

```ts
const ids = await frontModal.chooseMany({
  title: "Escolha os adicionais",
  options: [
    { id: "gelo", label: "Gelo" },
    { id: "copos", label: "Copos descartáveis" },
    { id: "guardanapo", label: "Guardanapos" },
  ],
  defaultValues: ["gelo"],
})
```

## Observações
- Se você chamar um `frontModal.*` enquanto outro estiver aberto, o atual será **cancelado** e substituído.
- Para callbacks customizados, use `onOk`, `onConfirm`, `onCancel` (opcional). O retorno por Promise continua valendo.

