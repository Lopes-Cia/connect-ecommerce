import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Phone,
  PhoneCall,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  Globe,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full mt-auto">
      <div className="w-full bg-[#f4f4f4] py-12 px-10 sm:px-4">
        <div className="max-w-7xl w-full mx-auto flex justify-center">
          <div className="w-125 lg:w-full max-w-[500px]!important lg:max-w-full flex flex-wrap justify-start lg:justify-center items-start gap-6 md:gap-10 py-8">
            <div className="flex flex-col items-center">
              <div>
                <h3 className="text-tints-french-blue font-montserrat font-bold text-lg mb-3">
                  Atendimento ao Cliente
                </h3>
                <h4 className="text-custom-dark-1000 font-montserrat font-semibold text-base mb-2">
                  Horário de Atendimento
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-tints-french-blue" />
                    <span className="text-custom-dark-1000 font-montserrat text-sm">
                      Segunda a sexta: 8:00 às 18:00h
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-tints-french-blue" />
                    <span className="text-custom-dark-1000 font-montserrat text-sm">
                      Contato: +55 (41) 9 8445-1128
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-tints-french-blue" />
                    <span className="text-custom-dark-1000 font-montserrat text-sm">
                      SAC: +55 (41) 9 8445-1128
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-tints-french-blue" />
                    <span className="text-custom-dark-1000 font-montserrat text-sm">
                      Email: suporte@connectvendas.app
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href="https://facebook.com"
                    target="_blank"
                    className="w-8 h-8 rounded-full bg-tints-french-blue flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <Facebook className="w-4 h-4 text-white" />
                  </Link>
                  <Link
                    href="https://instagram.com"
                    target="_blank"
                    className="w-8 h-8 rounded-full bg-tints-french-blue flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <Instagram className="w-4 h-4 text-white" />
                  </Link>
                  <Link
                    href="https://youtube.com"
                    target="_blank"
                    className="w-8 h-8 rounded-full bg-tints-french-blue flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <Youtube className="w-4 h-4 text-white" />
                  </Link>
                  <Link
                    href="#"
                    className="w-8 h-8 rounded-full bg-tints-french-blue flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <Globe className="w-4 h-4 text-white" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div>
                <h3 className="text-tints-french-blue font-montserrat font-bold text-lg mb-3">
                  Informações
                </h3>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm mb-1 hover:text-tints-french-blue transition-colors"
                >
                  Entrega
                </Link>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm mb-1 hover:text-tints-french-blue transition-colors"
                >
                  Sobre Nós
                </Link>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm mb-1 hover:text-tints-french-blue transition-colors"
                >
                  Pagamento
                </Link>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm mb-1 hover:text-tints-french-blue transition-colors"
                >
                  Promoções
                </Link>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm mb-1 hover:text-tints-french-blue transition-colors"
                >
                  Frete F.O.B
                </Link>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm mb-1 hover:text-tints-french-blue transition-colors"
                >
                  Compra Programada
                </Link>
                <Link
                  href="/politica-de-privacidade"
                  className="block text-custom-dark-1000 font-montserrat font-medium text-sm hover:text-tints-french-blue transition-colors"
                >
                  Seja Nosso Parceiro
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div>
                <h3 className="text-tints-french-blue font-montserrat font-bold text-lg mb-3">
                  Área do Cliente
                </h3>
                <div className="space-y-1.5">
                  <Link
                    href="/privacy"
                    className="block text-custom-dark-1000 font-montserrat font-medium text-sm hover:text-tints-french-blue transition-colors"
                  >
                    Política de Privacidade
                  </Link>
                  <Link
                    href="/terms"
                    className="block text-custom-dark-1000 font-montserrat font-medium text-sm hover:text-tints-french-blue transition-colors"
                  >
                    Termos de Uso
                  </Link>
                  <Link
                    href="/minha-conta"
                    className="block text-custom-dark-1000 font-montserrat font-medium text-sm hover:text-tints-french-blue transition-colors"
                  >
                    Minha Conta
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div>
                <h3 className="text-tints-french-blue font-montserrat font-bold text-lg mb-3">
                  Formas de Pagamento
                </h3>
                <Image
                  src="/assets/formas-de-pagamento.png"
                  alt="Formas de Pagamento: Visa, Elo, Aura, Hipercard, Mastercard, Amex, Diners, JCB, Pix, Boleto"
                  width={280}
                  height={82}
                  className="mb-1 select-none pointer-events-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-tints-french-blue py-5 px-4">
        <p className="text-center text-white font-montserrat text-sm">
          © 2026 Connect | CPNJ: 00.000.000/0000-00 | Todos os Direitos Reservados | © 2026 Lopes & Cia
        </p>
      </div>
    </footer>
  );
}
