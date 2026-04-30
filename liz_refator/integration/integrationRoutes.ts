export const PRODUTOS_INTEGRATION_ROUTES = {
  getListCategoria: '/webservice/integration/getListCategoria',
  getCategoria: '/webservice/integration/getCategoria',
  getProdutoLoja: '/webservice/integration/getProdutoLoja',
  getListProdutoLoja: '/webservice/integration/getListProdutoLoja',
} as const

export const CLIENTES_API_ROUTES = {
  enviarToken: '/webservice/api/enviarToken',
  verificarToken: '/webservice/api/verificarTokenSistema',
  getClienteLoja: '/Servidor/webservice/integration/getClienteLoja',
  getProximoCustomerIdIntegrado: '/Servidor/webservice/integration/getProximoCustomerIdIntegrado',
  insertClienteLoja: '/Servidor/webservice/integration/insertClienteLoja',
} as const
