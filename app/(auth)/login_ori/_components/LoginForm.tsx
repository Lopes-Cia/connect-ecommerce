"use client";

import { useEffect, useState } from "react";
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
  const fixedEmail = "eduardo.rezende@lopesecia.com.br";
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
      value: fixedEmail,
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
  const displayedValue = selectedChannel === "email" ? fixedEmail : contactValue;

  useEffect(() => {
    if (selectedChannel !== "email") return;
    setSendValue("value", fixedEmail, { shouldDirty: false, shouldTouch: false, shouldValidate: true });
  }, [fixedEmail, selectedChannel, setSendValue]);

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
                value={displayedValue}
                readOnly={selectedChannel === "email"}
                onChange={(event) => {
                  if (selectedChannel === "email") return;
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
