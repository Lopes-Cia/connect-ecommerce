# Lopes & Cia (9004) — Integração (Produto/Categoria)

Base (atual no connect-ecommerce):
- `INTEGRATION_URL_API_BACK=https://gp.lopesecia.com.br:9004/Servidor`

Auth:
- Header: `Authorization: <hashToken>`
- Token: `POST {AUTH_BASE_URL}/tokenService`

---

## Endpoints (os 4 usados no client)

### 1) GET `/webservice/integration/getListCategoria`

Retorna lista de categorias.

- Query (obrigatória)
  - `idIntegradora` (integer)
- Query (opcional)
  - `codigo` (integer)
  - `codPai` (integer)
  - `categoria` (string)
  - `idCatMarketplace` (string)
  - `nomeCatMarketplace` (string)
- 200 OK
  - `array<VinculoCatMercadoLivreBean>`

Exemplo:
```
GET https://gp.lopesecia.com.br:9004/Servidor/webservice/integration/getListCategoria?idIntegradora=8
Authorization: <hashToken>
```

---

### 2) GET `/webservice/integration/getCategoria`

Retorna uma categoria.

- Query (obrigatória)
  - `idIntegradora` (integer)
  - `codigo` (integer)
- 200 OK
  - `VinculoCatMercadoLivreBean`

Exemplo:
```
GET https://gp.lopesecia.com.br:9004/Servidor/webservice/integration/getCategoria?idIntegradora=8&codigo=123
Authorization: <hashToken>
```

---

### 3) GET `/webservice/integration/getProdutoLoja`

Retorna um produto específico (contexto loja).

- Query (obrigatória)
  - `idIntegradora` (integer)
- Query (opcional)
  - `codProd` (integer)
  - `ean` (string)
  - `productId` (string)
  - `descricaoErp` (string)
  - `skuId` (string)
  - `cnpjCliente` (string)
- 200 OK
  - `ProdutoLojaBean`

Exemplo:
```
GET https://gp.lopesecia.com.br:9004/Servidor/webservice/integration/getProdutoLoja?idIntegradora=8&codProd=123
Authorization: <hashToken>
```

---

### 4) GET `/webservice/integration/getListProdutoLoja`

Retorna lista de produtos (contexto loja).

- Query (obrigatória)
  - `idIntegradora` (integer)
- Query (opcional)
  - `codProd` (integer)
  - `ean` (string)
  - `productId` (string)
  - `descricaoErp` (string)
  - `skuId` (string)
  - `cnpjCliente` (string)
  - `idCategoria` (integer)
- 200 OK
  - `ProdutoLojaBean`

Exemplo:
```
GET https://gp.lopesecia.com.br:9004/Servidor/webservice/integration/getListProdutoLoja?idIntegradora=8
Authorization: <hashToken>
```

---

## Beans (padrão de resposta)

### VinculoCatMercadoLivreBean

Campos observados no schema:
- `idIntegradora` (int32)
- `codigo` (int32)
- `codPai` (int32)
- `categoria` (string)
- `idMercadoLivre` (string)
- `nomeMercadoLivre` (string)
- `detalhamento` (string)
- `imagem` (string)
- `codProd` (int32)
- `sequencia` (int32)

### ProdutoLojaBean

Campos observados no schema:
- `codProd` (int32)
- `idIntegradora` (int32)
- `descricaoErp` (string)
- `descricaoEcomerce` (string)
- `ean` (string)
- `productId` (string)
- `skuId` (string)
- `preco` (number)
- `promotion` (number)
- `qtEstoque` (number)
- `imagens` (string[])
- `categorias` (`VinculoCatMercadoLivreBean[]`)

