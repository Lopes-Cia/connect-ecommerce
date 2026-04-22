# Cópia do código (main) — referência

## app/(auth)/layout.tsx

```tsx
import Header from "@/components/layout/Header";
import CategoryHeader from "@/components/layout/CategoryHeader";
import Footer from "@/components/layout/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <CategoryHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
```

## app/(auth)/login/page.tsx

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LoginForm from "./_components/LoginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-8 mt-8">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-black font-montserrat text-sm mb-8 hover:text-tints-french-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="bg-[linear-gradient(to_bottom,#080956_0%,#040228_100%)] rounded-lg shadow-xl p-8 border border-custom-light-400">
          <div className="text-center mb-8">
            <Image
              src="/logo.png"
              alt="New Bread Logo"
              width={120}
              height={120}
              className="mx-auto mb-4"
            />
            <p className="text-white font-montserrat text-sm">
              Faça login para continuar
            </p>
          </div>
          <LoginForm />
        </div>

        <p className="text-center text-black font-montserrat text-xs mt-6">
          Ao fazer login, você concorda com nossos{" "}
          <Link
            href="/terms"
            className="text-tints-french-blue hover:underline"
          >
            Termos de Uso
          </Link>{" "}
          e{" "}
          <Link
            href="/privacy"
            className="text-tints-french-blue hover:underline"
          >
            Política de Privacidade
          </Link>
        </p>
      </div>
    </div>
  );
}
```

## app/(auth)/login/_components/LoginForm.tsx

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { sendLoginToken, verifyLoginToken } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatWhatsapp(value: string): string {
  const digits = onlyDigits(value).slice(0, 13);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const sendTokenSchema = z
  .object({
    channel: z.enum(["email", "whatsapp"]),
    value: z.string().min(1, "Informe o e-mail ou WhatsApp"),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "email") {
      const result = z.email("Digite um e-mail válido").safeParse(data.value.trim());
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          message: "Digite um e-mail válido",
          path: ["value"],
        });
      }
      return;
    }

    const digits = onlyDigits(data.value);
    if (digits.length < 10 || digits.length > 13) {
      ctx.addIssue({
        code: "custom",
        message: "Digite um WhatsApp válido",
        path: ["value"],
      });
    }
  });

const verifySchema = z.object({
  token: z
    .string()
    .min(1, "Informe o token recebido")
    .min(4, "Token inválido"),
});

type SendTokenInput = z.input<typeof sendTokenSchema>;
type SendTokenOutput = z.output<typeof sendTokenSchema>;
type VerifyInput = z.input<typeof verifySchema>;
type VerifyOutput = z.output<typeof verifySchema>;

export default function LoginForm() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [step, setStep] = useState<"send" | "verify">("send");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [destinationPreview, setDestinationPreview] = useState<string>("");

  const {
    register: registerSend,
    handleSubmit: handleSubmitSend,
    watch: watchSend,
    setValue: setSendValue,
    formState: { errors: sendErrors },
  } = useForm<SendTokenInput, unknown, SendTokenOutput>({
    resolver: zodResolver(sendTokenSchema),
    defaultValues: {
      channel: "email",
      value: "",
    },
  });

  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    formState: { errors: verifyErrors },
  } = useForm<VerifyInput, unknown, VerifyOutput>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      token: "",
    },
  });

  const selectedChannel = watchSend("channel");
  const contactValue = watchSend("value");

  const onSendToken = async (data: SendTokenOutput) => {
    setIsLoading(true);
    setFeedbackMessage(null);
    setFeedbackSuccess(false);

    try {
      const payload =
        data.channel === "email"
          ? { email: data.value.trim() }
          : { whatsapp: onlyDigits(data.value) };

      const response = await sendLoginToken(payload);

      if (!response.success) {
        setFeedbackMessage(response.message ?? "Não foi possível enviar o token de acesso.");
        return;
      }

      setFeedbackSuccess(true);
      setFeedbackMessage("Token enviado com sucesso. Verifique e continue.");
      setDestinationPreview(data.value);
      setStep("verify");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Erro inesperado ao enviar token."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyToken = async (data: VerifyOutput) => {
    setIsLoading(true);
    setFeedbackMessage(null);
    setFeedbackSuccess(false);

    try {
      const response = await verifyLoginToken({ token: data.token.trim() });

      if (!response.success) {
        setFeedbackMessage(response.message ?? "Token inválido ou expirado.");
        return;
      }

      setFeedbackSuccess(true);
      setFeedbackMessage("Login validado com sucesso. Redirecionando...");
      await refreshSession();
      router.push("/");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Erro inesperado ao validar token."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {step === "send" ? (
        <form onSubmit={handleSubmitSend(onSendToken)} className="space-y-5">
          <div>
            <label className="block text-white font-montserrat font-medium text-sm mb-2">
              Canal de envio
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-md border border-custom-light-400 bg-white px-3 py-2 text-sm font-montserrat text-black">
                <input type="radio" value="email" {...registerSend("channel")} />
                <Mail className="h-4 w-4" /> E-mail
              </label>
              <label className="flex items-center gap-2 rounded-md border border-custom-light-400 bg-white px-3 py-2 text-sm font-montserrat text-black">
                <input type="radio" value="whatsapp" {...registerSend("channel")} />
                <Phone className="h-4 w-4" /> WhatsApp
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="value"
              className="block text-white font-montserrat font-medium text-sm mb-2"
            >
              {selectedChannel === "email" ? "E-mail" : "WhatsApp"}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                {selectedChannel === "email" ? (
                  <Mail className="w-5 h-5 text-custom-light-600" />
                ) : (
                  <Phone className="w-5 h-5 text-custom-light-600" />
                )}
              </div>
              <input
                id="value"
                type={selectedChannel === "email" ? "email" : "tel"}
                {...registerSend("value")}
                value={contactValue}
                onChange={(event) => {
                  const nextValue =
                    selectedChannel === "whatsapp"
                      ? formatWhatsapp(event.target.value)
                      : event.target.value;

                  setSendValue("value", nextValue, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
                className={`w-full pl-10 pr-4 py-3 border ${
                  sendErrors.value
                    ? "border-red-500 focus:ring-red-500"
                    : "border-custom-light-400 focus:ring-tints-french-blue"
                } rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
                placeholder={
                  selectedChannel === "email" ? "seu@email.com" : "(62) 99999-9999"
                }
              />
            </div>
            {sendErrors.value && (
              <p className="mt-1 text-red-500 font-montserrat text-xs">
                {sendErrors.value.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-white text-tints-french-blue font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando token...
              </>
            ) : (
              "Receber token"
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitVerify(onVerifyToken)} className="space-y-5">
          <div className="rounded-md bg-white/10 px-3 py-2 text-xs text-white font-montserrat">
            Token enviado para: <strong>{destinationPreview}</strong>
          </div>

          <div>
            <label
              htmlFor="token"
              className="block text-white font-montserrat font-medium text-sm mb-2"
            >
              Token de validação
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <ShieldCheck className="w-5 h-5 text-custom-light-600" />
              </div>
              <input
                id="token"
                type="text"
                {...registerVerify("token")}
                className={`w-full pl-10 pr-4 py-3 border ${
                  verifyErrors.token
                    ? "border-red-500 focus:ring-red-500"
                    : "border-custom-light-400 focus:ring-tints-french-blue"
                } rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
                placeholder="Digite o código recebido"
              />
            </div>
            {verifyErrors.token && (
              <p className="mt-1 text-red-500 font-montserrat text-xs">
                {verifyErrors.token.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-white text-tints-french-blue font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Validando...
              </>
            ) : (
              "Validar e entrar"
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setStep("send");
              setFeedbackMessage(null);
            }}
            className="w-full py-2 text-white font-montserrat text-sm hover:underline disabled:opacity-50"
          >
            Alterar canal de envio
          </button>
        </form>
      )}

      {feedbackMessage && (
        <div
          className={`rounded-md px-3 py-2 text-xs font-montserrat ${
            feedbackSuccess ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
          }`}
        >
          {feedbackMessage}
        </div>
      )}

      <p className="text-center text-white font-montserrat text-sm">
        Não tem uma conta?{" "}
        <Link href="/register" className="text-white text-xs font-semibold hover:underline">
          Registre-se
        </Link>
      </p>
    </div>
  );
}
```

## app/api/auth/send-token/route.ts

```ts
import { NextResponse } from 'next/server'

import { getAuthWebserviceBaseUrl } from '@/lib/auth/externalApi'
import { ensureAuthReady } from '@/lib/integration/authService'
import { fetchWithRetry, readResponseData } from '@/lib/integration/network'
import { toRawToken } from '@/lib/integration/token'

interface SendTokenRequestBody {
  email?: string
  whatsapp?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendTokenRequestBody
    const email = body.email?.trim() ?? ''
    const whatsapp = body.whatsapp?.trim() ?? ''

    if (!email && !whatsapp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Informe email ou whatsapp para enviar o token.',
        },
        {
          status: 400,
        }
      )
    }

    const query = new URLSearchParams()
    if (email) {
      query.set('email', email)
    } else {
      query.set('whatsapp', whatsapp)
    }

    const url = `${getAuthWebserviceBaseUrl()}/enviarToken?${query.toString()}`
    const auth = await ensureAuthReady({ backgroundRefresh: false })
    const authHeader = toRawToken(auth.token.hashToken)

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
      },
      {
        maxAttempts: 3,
      }
    )

    const data = await readResponseData<unknown>(response)

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao enviar token de acesso.',
          data,
        },
        {
          status: response.status,
        }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected send-token error'

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
```

## app/api/auth/verify-token/route.ts

```ts
import { NextResponse } from 'next/server'

import { setSession } from '@/lib/auth/session'
import { getAuthWebserviceBaseUrl } from '@/lib/auth/externalApi'
import { ensureAuthReady } from '@/lib/integration/authService'
import { fetchWithRetry, readResponseData } from '@/lib/integration/network'
import { toRawToken } from '@/lib/integration/token'

interface VerifyTokenRequestBody {
  token: string
}

interface VerifyTokenResponse {
  idUsuario: number
  hashToken: string
  canal: string
  cnpjCliente?: string
  dtCriacao?: string
  dtExpira?: string
  usado?: boolean
  tentativas?: number
  maxTentativas?: number
}

interface OperadorResponse {
  id: number
  nome?: string
  email?: string
  telefone?: string
  [key: string]: unknown
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<VerifyTokenRequestBody>
    const token = (body.token ?? '').trim()

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token de validacao e obrigatorio.',
        },
        {
          status: 400,
        }
      )
    }

    const auth = await ensureAuthReady({ backgroundRefresh: false })
    const authHeader = toRawToken(auth.token.hashToken)
    const baseUrl = getAuthWebserviceBaseUrl()

    const verifyUrl = `${baseUrl}/verificarTokenSistema?token=${encodeURIComponent(token)}`
    const verifyResponse = await fetchWithRetry(
      verifyUrl,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
      },
      {
        maxAttempts: 3,
      }
    )

    const verifyData = await readResponseData<VerifyTokenResponse>(verifyResponse)

    if (!verifyResponse.ok || !verifyData || typeof verifyData.idUsuario !== 'number') {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao validar token informado.',
          data: verifyData,
        },
        {
          status: verifyResponse.status || 401,
        }
      )
    }

    const operadorUrl = `${baseUrl}/getOperadorSistemaForId?id=${verifyData.idUsuario}`
    const operadorResponse = await fetchWithRetry(
      operadorUrl,
      {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      },
      {
        maxAttempts: 3,
      }
    )

    const operadorData = await readResponseData<OperadorResponse>(operadorResponse)

    if (!operadorResponse.ok || !operadorData || typeof operadorData.id !== 'number') {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao carregar operador autenticado.',
          data: operadorData,
        },
        {
          status: operadorResponse.status || 401,
        }
      )
    }

    await setSession({
      userId: String(operadorData.id),
      email: operadorData.email ?? '',
      token: verifyData.hashToken || token,
      name: operadorData.nome,
    })

    return NextResponse.json({
      success: true,
      data: {
        verification: verifyData,
        operador: operadorData,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected verify-token error'

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
```

## app/api/auth/register/route.ts

```ts
import { NextResponse } from 'next/server'

import { getActivationKey, getAuthWebserviceBaseUrl } from '@/lib/auth/externalApi'
import { ensureAuthReady } from '@/lib/integration/authService'
import { fetchWithRetry, readResponseData } from '@/lib/integration/network'
import { toRawToken } from '@/lib/integration/token'

interface RegisterRequestBody {
  responsavel: string
  cnpj: string
  email: string
  whatsapp: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RegisterRequestBody>
    const responsavel = (body.responsavel ?? '').trim()
    const cnpj = (body.cnpj ?? '').trim()
    const email = (body.email ?? '').trim()
    const whatsapp = (body.whatsapp ?? '').trim()

    if (!responsavel || !cnpj || !email || !whatsapp) {
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

    const url = `${getAuthWebserviceBaseUrl()}/postAutenticaAplicativo`
    const auth = await ensureAuthReady({ backgroundRefresh: false })
    const authHeader = toRawToken(auth.token.hashToken)

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          chaveAtivacao: getActivationKey(),
          responsavel,
          cnpj,
          email,
          whatsapp,
        }),
      },
      {
        maxAttempts: 3,
      }
    )

    const data = await readResponseData<unknown>(response)

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: 'Falha ao cadastrar cliente.',
          data,
        },
        {
          status: response.status,
        }
      )
    }

    return NextResponse.json({
      success: true,
      data,
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
```

## lib/api/auth.ts

```ts
import { apiClient } from './client'
import type {
  AuthResponse,
  OperadorPayload,
  RegisterUserInput,
  SendLoginTokenInput,
  VerifyLoginTokenInput,
  VerifyTokenPayload,
} from '@/lib/types/auth'
import type { Session } from '@/lib/auth/session'

export async function registerUser(
  payload: RegisterUserInput
): Promise<AuthResponse<unknown>> {
  return apiClient<AuthResponse<unknown>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function sendLoginToken(
  payload: SendLoginTokenInput
): Promise<AuthResponse<boolean>> {
  return apiClient<AuthResponse<boolean>>('/auth/send-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyLoginToken(
  payload: VerifyLoginTokenInput
): Promise<AuthResponse<{ verification: VerifyTokenPayload; operador: OperadorPayload }>> {
  return apiClient<AuthResponse<{ verification: VerifyTokenPayload; operador: OperadorPayload }>>(
    '/auth/verify-token',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export async function logout(): Promise<AuthResponse<undefined>> {
  return apiClient<AuthResponse<undefined>>('/auth/logout', {
    method: 'POST',
  })
}

export async function getCurrentSession(): Promise<AuthResponse<Session>> {
  return apiClient<AuthResponse<Session>>('/auth/me', {
    method: 'GET',
  })
}
```

## lib/auth/session.ts

```ts
import { cookies } from 'next/headers'

export interface Session {
  userId: string
  email: string
  token: string
  name?: string
}

export async function getSession(): Promise<Session | null> {
  // TODO: Implement actual session retrieval from cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  
  if (!sessionCookie) {
    return null
  }

  try {
    // TODO: Validate and decode session token
    return JSON.parse(sessionCookie.value) as Session
  } catch {
    return null
  }
}

export async function setSession(session: Session): Promise<void> {
  // TODO: Implement actual session storage in cookies
  const cookieStore = await cookies()
  cookieStore.set('session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSession(): Promise<void> {
  // TODO: Implement actual session clearing
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
```

## lib/auth/externalApi.ts

```ts
import 'server-only'

import { getIntegrationEnvConfig } from '@/lib/integration/config'

export function getAuthWebserviceBaseUrl(): string {
  return getIntegrationEnvConfig().authBaseUrl
}

export function getActivationKey(): string {
  return getIntegrationEnvConfig().key
}
```

## lib/integration/authService.ts (trechos relevantes)

```ts
async function requestIntegrationConfig(token: TokenResponse, keyBean: KeyBean): Promise<IntegrationConfig> {
  const env = getIntegrationEnvConfig()
  const normalizedUrlApi = keyBean.urlApi.replace(/\/+$/, '')
  const url = `${normalizedUrlApi}/Servidor/webservice/integration/getIntegradora?id=${env.idIntegradora}`

  const response = await fetchWithRetry(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: toRawToken(token.hashToken),
      },
    },
    { maxAttempts: 3 }
  )

  const data = await readResponseData<unknown>(response)

  if (response.status !== 200) {
    throw new HttpError('Failed to fetch integration config', response.status, url, data)
  }

  return ensureObject<IntegrationConfig>(data, 'Invalid integration config response')
}

export async function ensureAuthReady(options: EnsureAuthOptions = {}): Promise<AuthStateBundle> {
  const state = getIntegrationAuthState()

  if (!hasCompleteAuthState(state)) {
    return runBootSequenceOnce()
  }

  const token = state.token as TokenResponse

  if (options.forceRefresh || isTokenExpired(token)) {
    await runRefreshWithLock(true)
    return getOrThrowBundle()
  }

  if (isTokenExpiringSoon(token)) {
    const runInBackground = options.backgroundRefresh ?? true

    if (runInBackground) {
      runRefreshWithLock(false)
    } else {
      await runRefreshWithLock(true)
    }
  }

  return getOrThrowBundle()
}
```

