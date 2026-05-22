# MOCK-END-MICRO — CONNECT (Rotas) TESTE

## Base URL

- Base: `{BASE_URL_API}:{PORT}/connect`
- Exemplo (local): `http://localhost:4004/connect`

## Base (Next / contrato traduzido)

- Base (local): `http://localhost:3000/api/lopes`
- Observação: esses endpoints retornam o mesmo “contrato do front” (shape `success/data`) e usam a camada de tradução em `liz_refator/contracts/lopes`.

## Rotas

### Produtos

- **GET** `{BASE}/produtos/categorias`
  - Params: —
  - Query: —
  - Next (traduzido): `GET /api/lopes/produtos/categorias`

- **GET** `{BASE}/produtos/categorias/by-slug/{slug...}`
  - Params:
    - `slug...` (string) — aceita path com barras (ex.: `categoria/bebidas`)
  - Query: —
  - Next (traduzido): `GET /api/lopes/produtos/categorias/by-slug/{slug...}`

- **GET** `{BASE}/produtos/categorias/{idCategoria}`
  - Params:
    - `idCategoria` (number)
  - Query: —
  - Next (traduzido): `GET /api/lopes/produtos/categorias/{idCategoria}`

- **GET** `{BASE}/produtos/by-categoria/{idCategoria}`
  - Params:
    - `idCategoria` (number)
  - Query (opcionais):
    - `includeDescendants` (0|1) — default `1`
    - `page` (number) — default `1`
    - `pageSize` (number) — default `24` (máx `100`)
  - Next (traduzido): `GET /api/lopes/produtos/by-categoria/{idCategoria}?includeDescendants&page&pageSize`

- **GET** `{BASE}/produtos/by-id/{idProduto}`
  - Params:
    - `idProduto` (number)
  - Query: —
  - Next (traduzido): `GET /api/lopes/produtos/by-id/{idProduto}`

- **GET** `{BASE}/produtos/by-slug/{slug}`
  - Params:
    - `slug` (string) — slug do produto (recomendado terminar com `-<idProduto>`, ex.: `heineken-lata-269ml-123`)
  - Query: —
  - Next (traduzido): `GET /api/lopes/produtos/by-slug/{slug}`

- **GET** `{BASE}/produtos/brands`
  - Params: —
  - Query: —
  - Next (traduzido): `GET /api/lopes/produtos/brands`

- **GET** `{BASE}/produtos/brands/{idBrand}`
  - Params:
    - `idBrand` (number)
  - Query (opcionais):
    - `page` (number) — default `1`
    - `pageSize` (number) — default `24` (máx `100`)
  - Next (traduzido): `GET /api/lopes/produtos/brands/{idBrand}?page&pageSize`

- **GET** `{BASE}/produto-loja`
  - Query: mesmos campos de busca do produto-loja (ex.: `codProd`, `ean`, `productId`, `descricaoErp`, `skuId`, `cnpjCliente`)
  - Next (traduzido): `GET /api/lopes/produto-loja?codProd&ean&productId&descricaoErp&skuId&cnpjCliente`

### Ecommerce

- **GET** `{BASE}/ecommerce`
  - Params: —
  - Query: —

### Usuarios

- **POST** `{BASE}/usuarios/login`
  - Body (JSON):
    - `email` (string)
    - `senha` (string)

- **POST** `{BASE}/usuarios/cadastro`
  - Body (JSON):
    - `meus_dados` (object)
      - `tipoPessoa` ("PF"|"PJ")
      - `documento` (string)
      - `nome` (string)
      - `nomeFantasia` (string, obrigatório se `tipoPessoa="PJ"`)
      - `email` (string)
      - `whatsapp` (string)
      - `senha` (string)
      - `status` ("ativo"|"inativo", default "ativo")
    - `enderecos` (array, mínimo 1 item)
      - item:
        - `cep` (string)
        - `logradouro` (string)
        - `numero` (string)
        - `bairro` (string)
        - `cidade` (string)
        - `uf` (string, ex.: "SP")
        - `pais` (string, default "BR")
        - opcionais: `rotulo`, `principal`, `complemento`, `referencia`
    - `privacidade` (object)
      - `aceitaMarketing` (boolean)
      - `aceitaTermos` (boolean)
      - `aceitaCookies` (boolean)
      - `canalPreferido` (string)
      - `doisFatores` (object)
        - `habilitado` (boolean)
        - `metodo` ("email"|"whatsapp")

- **PUT** `{BASE}/usuarios/meus-dados`
  - Body (JSON):
    - `clienteId` (number)
    - `patch` (object) — campos mutáveis de `meus_dados` (ex.: `nome`, `email`, `whatsapp`, `status`, etc.)

- **PUT** `{BASE}/usuarios/privacidade`
  - Body (JSON):
    - `clienteId` (number)
    - `patch` (object)
      - `aceitaMarketing` (boolean)
      - `aceitaTermos` (boolean)
      - `aceitaCookies` (boolean)
      - `canalPreferido` (string)
      - `doisFatores` (object)

- **GET** `{BASE}/usuarios/enderecos/{clienteId}`
  - Params:
    - `clienteId` (number)

- **POST** `{BASE}/usuarios/enderecos`
  - Body (JSON):
    - `clienteId` (number)
    - `endereco` (object) — mesmo formato do item de endereço do cadastro

- **PUT** `{BASE}/usuarios/enderecos/{enderecoId}`
  - Params:
    - `enderecoId` (number)
  - Body (JSON):
    - `clienteId` (number, opcional)
    - `patch` (object) — campos de endereço (ex.: `referencia`, `logradouro`, `numero`, etc.)

- **DELETE** `{BASE}/usuarios/enderecos/{enderecoId}`
  - Params:
    - `enderecoId` (number)
  - Body (JSON):
    - `clienteId` (number, opcional)

### Checkout

- **GET** `{BASE}/carrinho/{clienteId}`
  - Params:
    - `clienteId` (number)

- **POST** `{BASE}/carrinho/itens`
  - Body (JSON):
    - `clienteId` (number)
    - `item` (object)
      - `produtoId` (number)
      - `quantidade` (number)

- **PUT** `{BASE}/carrinho/itens/{itemId}`
  - Params:
    - `itemId` (number)
  - Body (JSON):
    - `clienteId` (number)
    - `patch` (object)
      - `quantidade` (number)

- **DELETE** `{BASE}/carrinho/itens/{itemId}`
  - Params:
    - `itemId` (number)
  - Body (JSON):
    - `clienteId` (number)

- **POST** `{BASE}/carrinho/cupom`
  - Body (JSON):
    - `clienteId` (number)
    - `codigo` (string)

- **DELETE** `{BASE}/carrinho/cupom`
  - Body (JSON):
    - `clienteId` (number)

- **POST** `{BASE}/checkout/sessoes`
  - Body (JSON):
    - `clienteId` (number)
    - `contato` (object): `nome`, `email`, `telefone`
    - `enderecoEntrega` (object): mesmo formato de endereço do cadastro

- **GET** `{BASE}/checkout/sessoes/{checkoutId}`
  - Params:
    - `checkoutId` (number)

- **PUT** `{BASE}/checkout/sessoes/{checkoutId}/contato`
  - Params:
    - `checkoutId` (number)
  - Body (JSON):
    - `patch` (object): `nome`, `email`, `telefone`

- **PUT** `{BASE}/checkout/sessoes/{checkoutId}/entrega/endereco`
  - Params:
    - `checkoutId` (number)
  - Body (JSON):
    - `endereco` (object): mesmo formato de endereço do cadastro

- **GET** `{BASE}/checkout/sessoes/{checkoutId}/entrega/frete/opcoes`
  - Params:
    - `checkoutId` (number)
  - Query (opcional):
    - `cep` (string)

- **PUT** `{BASE}/checkout/sessoes/{checkoutId}/entrega/frete`
  - Params:
    - `checkoutId` (number)
  - Body (JSON):
    - `codigo` (string)

- **POST** `{BASE}/checkout/sessoes/{checkoutId}/pagamento/pix`
  - Params:
    - `checkoutId` (number)
  - Body (JSON):
    - `ttlMinutos` (number, opcional)

- **POST** `{BASE}/checkout/sessoes/{checkoutId}/pagamento/pix/confirmar`
  - Params:
    - `checkoutId` (number)

- **POST** `{BASE}/checkout/sessoes/{checkoutId}/finalizar`
  - Params:
    - `checkoutId` (number)

- **GET** `{BASE}/pedidos/{pedidoId}`
  - Params:
    - `pedidoId` (number)

- **GET** `{BASE}/pedidos`
  - Query (opcionais):
    - `clienteId` (number)
    - `page` (number)
    - `pageSize` (number)

## Assets

- **GET** `{BASE_URL_API}:{PORT}/assets/images/{path}`
  - Ex.: `http://localhost:4004/assets/images/banners/banner-1.webp`
