"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";

const registerSchema = z
	.object({
		name: z
			.string()
			.min(1, "O nome e obrigatorio")
			.min(3, "Digite seu nome completo"),
		email: z.email("Digite um e-mail valido"),
		password: z
			.string()
			.min(1, "A senha e obrigatoria")
			.min(6, "A senha deve ter no minimo 6 caracteres"),
		confirmPassword: z
			.string()
			.min(1, "Confirme sua senha"),
		acceptTerms: z.boolean().refine((value) => value, {
			message: "Voce precisa aceitar os termos para continuar",
		}),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "As senhas precisam ser iguais",
		path: ["confirmPassword"],
	});

type RegisterFormInput = z.input<typeof registerSchema>;
type RegisterFormOutput = z.output<typeof registerSchema>;

export default function RegisterForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			acceptTerms: false,
		},
	});

	const onSubmit = async (data: RegisterFormOutput) => {
		setIsLoading(true);
		console.log("Register data:", data);

		await new Promise((resolve) => setTimeout(resolve, 1500));

		setIsLoading(false);
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
			<div>
				<label
					htmlFor="name"
					className="block text-white font-montserrat font-medium text-sm mb-2"
				>
					Nome completo
				</label>
				<div className="relative">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<User className="w-5 h-5 text-custom-light-600" />
					</div>
					<input
						id="name"
						type="text"
						{...register("name")}
						className={`w-full pl-10 pr-4 py-3 border ${
							errors.name
								? "border-red-500 focus:ring-red-500"
								: "border-custom-light-400 focus:ring-tints-french-blue"
						} rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
						placeholder="Seu nome completo"
					/>
				</div>
				{errors.name && (
					<p className="mt-1 text-red-500 font-montserrat text-xs">
						{errors.name.message}
					</p>
				)}
			</div>

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

			<div>
				<label
					htmlFor="confirmPassword"
					className="block text-white font-montserrat font-medium text-sm mb-2"
				>
					Confirmar senha
				</label>
				<div className="relative">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<Lock className="w-5 h-5 text-custom-light-600" />
					</div>
					<input
						id="confirmPassword"
						type={showConfirmPassword ? "text" : "password"}
						{...register("confirmPassword")}
						className={`w-full pl-10 pr-12 py-3 border ${
							errors.confirmPassword
								? "border-red-500 focus:ring-red-500"
								: "border-custom-light-400 focus:ring-tints-french-blue"
						} rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
						placeholder="••••••••"
					/>
					<button
						type="button"
						onClick={() => setShowConfirmPassword(!showConfirmPassword)}
						className="absolute inset-y-0 right-0 flex items-center pr-3 hover:opacity-70 transition-opacity"
					>
						{showConfirmPassword ? (
							<EyeOff className="w-5 h-5 text-custom-light-600" />
						) : (
							<Eye className="w-5 h-5 text-custom-light-600" />
						)}
					</button>
				</div>
				{errors.confirmPassword && (
					<p className="mt-1 text-red-500 font-montserrat text-xs">
						{errors.confirmPassword.message}
					</p>
				)}
			</div>

			<div>
				<div className="flex items-start gap-3">
					<input
						id="acceptTerms"
						type="checkbox"
						{...register("acceptTerms")}
						className="mt-0.5 w-4 h-4 text-tints-french-blue border-custom-light-400 rounded focus:ring-tints-french-blue focus:ring-2"
					/>
					<label
						htmlFor="acceptTerms"
						className="text-white font-montserrat text-sm"
					>
						Li e aceito os <Link href="/terms" className="underline">Termos de Uso</Link> e a{" "}
						<Link href="/privacy" className="underline">Política de Privacidade</Link>
					</label>
				</div>
				{errors.acceptTerms && (
					<p className="mt-1 text-red-500 font-montserrat text-xs">
						{errors.acceptTerms.message}
					</p>
				)}
			</div>

			<button
				type="submit"
				disabled={isLoading}
				className="w-full py-3 bg-white text-tints-french-blue font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
			>
				{isLoading ? "Criando conta..." : "Criar conta"}
			</button>

			<div className="rounded-md border border-white/15 bg-white/5 p-4 text-center space-y-3">
				<p className="text-white font-montserrat text-sm">
					Já possui uma conta?
				</p>
				<Link
					href="/login"
					className="inline-flex items-center justify-center rounded-md border border-white bg-transparent px-4 py-2 text-sm font-montserrat font-semibold text-white transition-opacity hover:opacity-90"
				>
					Faça Login
				</Link>
			</div>
		</form>
	);
}