Exemplo prático de busca: "7891991307048" portaria pmpf


## Mix de produtos

- Atualizar os produtos que vão ser comercializados no e-commerce.
- É necessário que esses produtos existam no ERP.

## Campos usados no e-commerce (não existentes no ERP)

- Categoria
- Imagem
- Marca

Esses campos já estão mapeados pelo motor de IA, e a geração desses dados está automatizada.

## Preço, embalagem e estoque

- **Preço**: valor de **1 unidade**.
- **Embalagem**: quantidade **mínima de unidades** que pode ser comprada.
- **Estoque**: quantidade de **embalagens** disponíveis para venda.

### Exemplo

Produto: **Cerveja Original Lata 473 ml — caixa com 12 unidades**

- Esse produto é um fardo com **12 unidades**.
- O **preço** do produto é referente a **1 unidade**.
- A **embalagem** é referente ao mínimo de unidades que pode ser comprada (1 palete, 1/2 palete, 1/3 palete etc.), porém precisa ser possível quantificar em unidades.

## Sincronização (ERP x e-commerce)

Os parâmetros **preço**, **embalagem** e **estoque** precisam estar sincronizados entre o e-commerce e o ERP.

## Regras de negócio

- CEPs atendidos no e-commerce e definição de entrega (frete).
- Cadastro de cliente: apenas CNPJ; definição de regras (impacto fiscal).

