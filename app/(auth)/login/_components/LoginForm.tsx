"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useClientesStore } from "@/stores/clientes-store";

const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("Digite um e-mail válido"),
  senha: z.string().min(1, "Informe a senha"),
});

type LoginInput = z.input<typeof loginSchema>;
type LoginOutput = z.output<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const loginCliente = useClientesStore((s) => s.login);
  const isLoggedIn = useClientesStore((s) => s.isLoggedIn);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput, unknown, LoginOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "teste@exemplo.com",
      senha: "123456",
    },
  });

  useEffect(() => {
    if (!isLoggedIn) return;
    router.replace("/cliente/painel");
  }, [isLoggedIn, router]);

  const onSubmit = async (data: LoginOutput) => {
    setIsLoading(true);
    setFeedbackMessage(null);
    setFeedbackSuccess(false);

    try {
      const result = await loginCliente({ email: data.email, senha: data.senha });
      const hasToken = Boolean(result?.token);
      if (!hasToken) {
        setFeedbackMessage("Login retornou sucesso, mas sem token. Verifique a resposta do backend.");
        alert(JSON.stringify({ success: true, data: result }, null, 2));
        return;
      }

      setFeedbackSuccess(true);
      setFeedbackMessage("Login realizado. Confira o resultado no alert.");
      alert(JSON.stringify({ success: true, data: result }, null, 2));
      router.push("/cliente/painel");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao fazer login.";
      setFeedbackMessage(message);
      alert(JSON.stringify({ success: false, message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-white font-montserrat font-medium text-sm mb-2">
            E-mail
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Mail className="w-5 h-5 text-custom-light-600" />
            </div>
            <input
              id="email"
              type="email"
              {...register("email")}
              className={`w-full pl-10 pr-4 py-3 border ${
                errors.email ? "border-red-500 focus:ring-red-500" : "border-custom-light-400 focus:ring-tints-french-blue"
              } rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-red-500 font-montserrat text-xs">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="senha" className="block text-white font-montserrat font-medium text-sm mb-2">
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="w-5 h-5 text-custom-light-600" />
            </div>
            <input
              id="senha"
              type="password"
              {...register("senha")}
              className={`w-full pl-10 pr-4 py-3 border ${
                errors.senha ? "border-red-500 focus:ring-red-500" : "border-custom-light-400 focus:ring-tints-french-blue"
              } rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {errors.senha && (
            <p className="mt-1 text-red-500 font-montserrat text-xs">{errors.senha.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-white text-tints-french-blue font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
            </>
          ) : (
            "Login"
          )}
        </button>
      </form>

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
