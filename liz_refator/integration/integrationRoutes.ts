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
  getIntegradora: '/Servidor/webservice/integration/getIntegradora',
  getProximoCustomerIdIntegrado: '/Servidor/webservice/integration/getProximoCustomerIdIntegrado',
  insertClienteLoja: '/Servidor/webservice/integration/insertClienteLoja',
} as const

export const PEDIDOS_INTEGRATION_ROUTES = {
  insertDadoIntegration: '/Servidor/webservice/integration/insertDadoIntegration',
} as const

export const AUTH_API_ROUTES = {
  postAutenticaAplicativo: '/postAutenticaAplicativo',
  insertOperadorSistema: '/insertOperadorSistema',
  getOperadorSistema: '/getOperadorSistema',
  insertVinculoUsuarioSite: '/insertVinculoUsuarioSite',
  getVinculoUsuarioSite: '/getVinculoUsuarioSite',
} as const
