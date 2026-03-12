"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Link from "next/link";

// Validation schema
const loginSchema = z.object({
  email: z
    .email("Digite um e-mail válido"),
  password: z
    .string()
    .min(1, "A senha é obrigatória")
    .min(6, "A senha deve ter no mínimo 6 caracteres"),
  rememberMe: z.boolean().default(false),
});

type LoginFormInput = z.input<typeof loginSchema>;
type LoginFormOutput = z.output<typeof loginSchema>;

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormOutput) => {
    setIsLoading(true);
    // Simulate API call
    console.log("Login data:", data);
    
    // TODO: Implement actual login logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-white font-montserrat font-medium text-sm mb-2"
        >
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
              errors.email
                ? "border-red-500 focus:ring-red-500"
                : "border-custom-light-400 focus:ring-tints-french-blue"
            } rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
            placeholder="seu@email.com"
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-red-500 font-montserrat text-xs">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-white font-montserrat font-medium text-sm mb-2"
        >
          Senha
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className="w-5 h-5 text-custom-light-600" />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            className={`w-full pl-10 pr-12 py-3 border ${
              errors.password
                ? "border-red-500 focus:ring-red-500"
                : "border-custom-light-400 focus:ring-tints-french-blue"
            } rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 hover:opacity-70 transition-opacity"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 text-custom-light-600" />
            ) : (
              <Eye className="w-5 h-5 text-custom-light-600" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-red-500 font-montserrat text-xs">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            {...register("rememberMe")}
            className="w-4 h-4 text-tints-french-blue border-custom-light-400 rounded focus:ring-tints-french-blue focus:ring-2"
          />
          <label
            htmlFor="rememberMe"
            className="ml-2 text-white font-montserrat text-sm"
          >
            Lembrar de mim
          </label>
        </div>

        <Link
          href="/forgot-password"
          className="text-white font-montserrat text-sm hover:underline"
        >
          Esqueceu a senha?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-white text-tints-french-blue font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-white font-montserrat text-sm">
        Não tem uma conta?{" "}
        <Link href="/register" className="text-white text-xs font-semibold hover:underline">
          Registre-se
        </Link>
      </p>
    </form>
  );
}
