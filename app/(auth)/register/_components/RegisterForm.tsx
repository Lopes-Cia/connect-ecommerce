"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Mail, Phone, User } from "lucide-react";

import { registerUser } from "@/lib/api/auth";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);

  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const calcDigit = (base: string, factors: number[]) => {
    const sum = base
      .split("")
      .map((digit, index) => Number(digit) * factors[index])
      .reduce((acc, current) => acc + current, 0);

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calcDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigit(cnpj.slice(0, 12) + String(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cnpj.endsWith(`${d1}${d2}`);
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

function formatCnpj(value: string): string {
	const digits = onlyDigits(value).slice(0, 14);

	if (digits.length <= 2) {
		return digits;
	}

	if (digits.length <= 5) {
		return `${digits.slice(0, 2)}.${digits.slice(2)}`;
	}

	if (digits.length <= 8) {
		return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
	}

	if (digits.length <= 12) {
		return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
	}

	return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

const registerSchema = z
	.object({
		responsavel: z
			.string()
			.min(1, "O nome do responsavel e obrigatorio")
			.min(3, "Digite o nome completo"),
		cnpj: z
			.string()
			.min(1, "O CNPJ e obrigatorio")
			.refine((value) => isValidCnpj(value), "Digite um CNPJ valido"),
		email: z.email("Digite um e-mail valido"),
		whatsapp: z
			.string()
			.min(1, "O WhatsApp e obrigatorio")
			.refine((value) => {
				const digits = onlyDigits(value);
				return digits.length >= 10 && digits.length <= 13;
			}, "Digite um WhatsApp valido"),
		acceptTerms: z.boolean().refine((value) => value, {
			message: "Voce precisa aceitar os termos para continuar",
		}),
	});

type RegisterFormInput = z.input<typeof registerSchema>;
type RegisterFormOutput = z.output<typeof registerSchema>;

export default function RegisterForm() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [serverMessage, setServerMessage] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			responsavel: "",
			cnpj: "",
			email: "",
			whatsapp: "",
			acceptTerms: false,
		},
	});

	const cnpjValue = watch("cnpj");
	const whatsappValue = watch("whatsapp");

	const onSubmit = async (data: RegisterFormOutput) => {
		setIsLoading(true);
		setServerMessage(null);
		setIsSuccess(false);

		try {
			const response = await registerUser({
				responsavel: data.responsavel,
				cnpj: onlyDigits(data.cnpj),
				email: data.email,
				whatsapp: onlyDigits(data.whatsapp),
			});

			if (!response.success) {
				setServerMessage(response.message ?? "Nao foi possivel concluir o cadastro.");
				return;
			}

			setIsSuccess(true);
			setServerMessage("Cadastro realizado com sucesso. Agora voce ja pode fazer login.");

			setTimeout(() => {
				router.push("/login");
				router.refresh();
			}, 900);
		} catch (error) {
			setServerMessage(
				error instanceof Error ? error.message : "Erro inesperado ao cadastrar cliente."
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
			<div>
				<label
					htmlFor="responsavel"
					className="block text-white font-montserrat font-medium text-sm mb-2"
				>
					Nome completo
				</label>
				<div className="relative">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<User className="w-5 h-5 text-custom-light-600" />
					</div>
					<input
						id="responsavel"
						type="text"
						{...register("responsavel")}
						className={`w-full pl-10 pr-4 py-3 border ${
							errors.responsavel
								? "border-red-500 focus:ring-red-500"
								: "border-custom-light-400 focus:ring-tints-french-blue"
						} rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
						placeholder="Seu nome completo"
					/>
				</div>
				{errors.responsavel && (
					<p className="mt-1 text-red-500 font-montserrat text-xs">
						{errors.responsavel.message}
					</p>
				)}
			</div>

			<div>
				<label
					htmlFor="cnpj"
					className="block text-white font-montserrat font-medium text-sm mb-2"
				>
					CNPJ
				</label>
				<div className="relative">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<Building2 className="w-5 h-5 text-custom-light-600" />
					</div>
					<input
						id="cnpj"
						type="text"
						{...register("cnpj")}
						value={cnpjValue}
						onChange={(event) => {
							setValue("cnpj", formatCnpj(event.target.value), {
								shouldDirty: true,
								shouldTouch: true,
								shouldValidate: true,
							});
						}}
						className={`w-full pl-10 pr-4 py-3 border ${
							errors.cnpj
								? "border-red-500 focus:ring-red-500"
								: "border-custom-light-400 focus:ring-tints-french-blue"
						} rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
						placeholder="00.000.000/0000-00"
					/>
				</div>
				{errors.cnpj && (
					<p className="mt-1 text-red-500 font-montserrat text-xs">
						{errors.cnpj.message}
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
					htmlFor="whatsapp"
					className="block text-white font-montserrat font-medium text-sm mb-2"
				>
					WhatsApp
				</label>
				<div className="relative">
					<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
						<Phone className="w-5 h-5 text-custom-light-600" />
					</div>
					<input
						id="whatsapp"
						type="tel"
						{...register("whatsapp")}
						value={whatsappValue}
						onChange={(event) => {
							setValue("whatsapp", formatWhatsapp(event.target.value), {
								shouldDirty: true,
								shouldTouch: true,
								shouldValidate: true,
							});
						}}
						className={`w-full pl-10 pr-12 py-3 border ${
							errors.whatsapp
								? "border-red-500 focus:ring-red-500"
								: "border-custom-light-400 focus:ring-tints-french-blue"
						} rounded-md font-montserrat text-sm bg-white focus:outline-none focus:ring-2 transition-all`}
						placeholder="(62) 99999-9999"
					/>
				</div>
				{errors.whatsapp && (
					<p className="mt-1 text-red-500 font-montserrat text-xs">
						{errors.whatsapp.message}
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

			{serverMessage && (
				<div
					className={`rounded-md px-3 py-2 text-xs font-montserrat ${
						isSuccess ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
					}`}
				>
					{serverMessage}
				</div>
			)}

			<button
				type="submit"
				disabled={isLoading}
				className="w-full py-3 bg-white text-tints-french-blue font-montserrat font-semibold text-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
			>
				{isLoading ? "Cadastrando..." : "Cadastrar"}
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