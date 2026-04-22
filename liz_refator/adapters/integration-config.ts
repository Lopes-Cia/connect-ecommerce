import 'server-only'

/**
 * Adapter temporário para a camada legada (`lib/integration/**`).
 * A ideia é que o código novo em `liz_refator/**` dependa apenas de `liz_refator/**`,
 * e a substituição do legado aconteça trocando a implementação aqui (sem mexer nos callers).
 */
export { getIntegrationEnvConfig } from '@/lib/integration/config'

