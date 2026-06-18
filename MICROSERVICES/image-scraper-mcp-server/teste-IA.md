esses são os dados disponiveis do produto

{
  "id": 83,
  "sku": "7891991307048-83",
  "name": "Cerveja Original Lata 269 ml Multipack, caixa com 15 unidades",
  "slug": "/produtos/cerveja-original-lata-269-ml-multipack-caixa-com-15-unidades-83",
  "unitLabel": "lata",
  "sizeLabel": "269ml",
  "qtUnit": 15,
  "qtPalete": 15,
  "price": 1,
  "compareAtPrice": null,
  "badges": [],
  "image": "https://carrefourbrfood.vtexassets.com/arquivos/ids/182342993/3486141_1.jpg.jpg?v=638720268544630000",
  "stock": 23322,
  "inStock": true,
  "category": {
    "id": 1,
    "name": "Bebidas",
    "slug": "/categoria/bebidas",
    "familia": [
      {
        "id": 1,
        "name": "Bebidas",
        "slug": "/categoria/bebidas"
      }
    ]
  },
  "brand": {
    "id": 0,
    "name": "No Brand",
    "slug": "/marca/no-brand",
    "image": "https://lopesecia.com.br/img/semImagem.png"
  }
}


a partir desses dados presciso extrair o :
nome da marca (brand) desse produto
o logo da marca (brand) desse produto (1 imagem)
a imagem do produto (1 imagem de capa, e 2 imagens de detalhes)

Leve em consideração que a imagem do produto vai ser usada em um ecommerce online, é fundamental para a identificação do produto e uma vitrine atraente.


para extrair essas imagens, use o MCP image-scraper



/img logo "Original cerveja" --count 1
