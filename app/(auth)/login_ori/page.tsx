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
