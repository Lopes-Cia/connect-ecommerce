import { NextResponse } from 'next/server'

import { getIntegrationEnvConfig } from '@/liz_refator/adapters/integration-config'
import { parseLimCredFromGetIntegradora } from '@/liz_refator/contracts/lopes/clientes'
import {
  authRawGetJsonAuth,
  authRawPostJsonAuth,
  integrationRawGetJsonAuth,
  integrationRawPostJsonAuth,
  RawHttpError,
} from '@/liz_refator/integration/rawClient'
import { AUTH_API_ROUTES, CLIENTES_API_ROUTES } from '@/liz_refator/integration/integrationRoutes'

interface RegisterRequestBody {
  responsavel: string
  fantasia: string
  cnpj: string
  inscicao?: string | null
  email: string
  whatsapp: string
  cep: string
  rua: string
  numero?: string | null
  complemento?: string | null
  bairro: string
  municipio: string
  uf: string
}

function isNotFoundMessage(value: unknown): boolean {
  const text = typeof value === 'string' ? value : ''
  const normalized = text.toLowerCase()
  return normalized.includes('não encontrado') || normalized.includes('nao encontrado') || normalized.includes('nencontrado')
}

function parseInsertOk(input: unknown): boolean {
  if (input === true) return true
  if (input === false) return false
  if (input === 'true') return true
  if (input === 'false') return false
  return Boolean(input)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterRequestBody>
    const responsavel = (body.responsavel ?? '').trim()
    const fantasia = (body.fantasia ?? '').trim()
    const cnpj = (body.cnpj ?? '').trim()
    const email = (body.email ?? '').trim()
    const whatsapp = (body.whatsapp ?? '').trim()
    const cep = (body.cep ?? '').trim()
    const rua = (body.rua ?? '').trim()
    const bairro = (body.bairro ?? '').trim()
    const municipio = (body.municipio ?? '').trim()
    const uf = (body.uf ?? '').trim()
    const inscicao = (body.inscicao ?? '').trim()
    const numero = body.numero === null ? null : String(body.numero ?? '').trim() || null
    const complemento = body.complemento === null ? null : String(body.complemento ?? '').trim() || null

    if (!responsavel || !fantasia || !cnpj || !email || !whatsapp || !cep || !rua || !bairro || !municipio || !uf) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campos obrigatorios ausentes para cadastro.',
        },
        {
          status: 400,
        }
      )
    }

    const env = getIntegrationEnvConfig()

    try {
      const vinculo = await authRawGetJsonAuth<unknown>(AUTH_API_ROUTES.getVinculoUsuarioSite, { email, cnpj })
      return NextResponse.json({
        success: true,
        alreadyLinked: true,
        message: 'Vínculo já existe.',
        data: {
          vinculo: vinculo.data,
        },
      })
    } catch (error) {
      if (!(error instanceof RawHttpError && (error.status === 404 || isNotFoundMessage(error.data)))) {
        throw error
      }
    }

    let clienteExiste = false
    try {
      await integrationRawGetJsonAuth<unknown>(CLIENTES_API_ROUTES.getClienteLoja, { cgc: cnpj })
      clienteExiste = true
    } catch (error) {
      if (!(error instanceof RawHttpError && (error.status === 404 || isNotFoundMessage(error.data)))) {
        throw error
      }
    }

    let insertClienteOk = true
    if (!clienteExiste) {
      const customerIdResponse = await integrationRawGetJsonAuth<unknown>(CLIENTES_API_ROUTES.getProximoCustomerIdIntegrado)
      const customerId =
        typeof customerIdResponse.data === 'number'
          ? customerIdResponse.data
          : typeof customerIdResponse.data === 'string'
            ? Number.parseInt(customerIdResponse.data, 10)
            : 0
      if (!Number.isFinite(customerId) || customerId <= 0) {
        return NextResponse.json({ success: false, message: 'Invalid customerId from getProximoCustomerIdIntegrado.' }, { status: 500 })
      }

      const inteResponse = await integrationRawGetJsonAuth<unknown>(CLIENTES_API_ROUTES.getIntegradora, { id: env.idIntegradora })
      const limCred = parseLimCredFromGetIntegradora(inteResponse.data)

      const insertBody = {
        limCred,
        cliente: responsavel,
        fantasia,
        cgc: cnpj,
        inscicao,
        email,
        telefone: whatsapp,
        status: 'PEN',
        idIntegradora: env.idIntegradora,
        idTabPreco: 1,
        customerId,
        enderecos: [
          {
            customerId,
            codigoIbge: 0,
            rua,
            numero,
            complemento,
            bairro,
            cep,
            municipio,
            uf,
            principal: 'Sim',
          },
        ],
      }

      const inserted = await integrationRawPostJsonAuth<unknown>(CLIENTES_API_ROUTES.insertClienteLoja, insertBody)
      insertClienteOk = parseInsertOk(inserted.data)
      if (!insertClienteOk) {
        return NextResponse.json({ success: false, message: 'Falha ao cadastrar cliente no ERP.', data: inserted.data }, { status: 502 })
      }
    }

    await authRawPostJsonAuth<unknown>(AUTH_API_ROUTES.insertOperadorSistema, {
      status: 1,
      qt: 1,
      idFilial: 1,
      grupo: 'Usuário',
      nivel: 'Junior',
      nome: responsavel,
      telefone: whatsapp,
      email,
    })

    const operador = await authRawGetJsonAuth<unknown>(AUTH_API_ROUTES.getOperadorSistema, { email })
    const operadorRecord = operador.data && typeof operador.data === 'object' && !Array.isArray(operador.data) ? (operador.data as Record<string, unknown>) : null
    const idUsuario = operadorRecord && typeof operadorRecord.id === 'number' ? operadorRecord.id : null
    if (!idUsuario || idUsuario <= 0) {
      return NextResponse.json({ success: false, message: 'Falha ao recuperar idUsuario.' }, { status: 502 })
    }

    const vinculoInsert = await authRawPostJsonAuth<unknown>(AUTH_API_ROUTES.insertVinculoUsuarioSite, {
      idUsuario,
      idIntegradora: env.idIntegradora,
      cnpj,
    })

    if (!parseInsertOk(vinculoInsert.data)) {
      return NextResponse.json({ success: false, message: 'Falha ao vincular usuário ao site.', data: vinculoInsert.data }, { status: 502 })
    }

    const vinculoFinal = await authRawGetJsonAuth<unknown>(AUTH_API_ROUTES.getVinculoUsuarioSite, { email, cnpj })

    return NextResponse.json({
      success: true,
      alreadyLinked: false,
      message: 'Cadastro realizado com sucesso.',
      data: {
        clienteExiste,
        insertClienteOk,
        idUsuario,
        vinculo: vinculoFinal.data,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected register error'

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      }
    )
  }
}
