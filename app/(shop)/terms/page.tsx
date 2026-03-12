import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso | Connect",
  description: "Termos de Uso da plataforma Connect.",
};

const sections = [
  {
    title: "1. Aceitação dos termos",
    paragraphs: [
      "Ao acessar, navegar, se cadastrar ou realizar pedidos na Connect, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso e com a Política de Privacidade aplicável.",
      "Caso não concorde com qualquer disposição, o uso da plataforma deve ser interrompido imediatamente.",
    ],
  },
  {
    title: "2. Objeto da plataforma",
    paragraphs: [
      "A Connect é uma plataforma de comércio eletrônico voltada à divulgação e comercialização de produtos de uma distribuidora de bebidas e itens relacionados, incluindo, quando aplicável, bebidas alcoólicas, não alcoólicas, alimentos e produtos promocionais.",
      "A disponibilidade dos itens, condições comerciais, prazos e regiões atendidas pode variar conforme estoque, localidade e políticas operacionais da distribuidora.",
    ],
  },
  {
    title: "3. Cadastro e acesso",
    paragraphs: [
      "Algumas funcionalidades podem exigir criação de conta, com fornecimento de dados verdadeiros, completos e atualizados. O usuário é responsável pela guarda de seu login e senha e por toda atividade realizada em sua conta.",
      "A Connect pode suspender ou cancelar cadastros com indícios de fraude, uso indevido da plataforma, violação destes Termos ou informações inconsistentes.",
    ],
  },
  {
    title: "4. Regras para compra de bebidas alcoólicas",
    paragraphs: [
      "A compra de bebidas alcoólicas é permitida somente a pessoas maiores de 18 anos, nos termos da legislação brasileira. Ao concluir um pedido contendo tais produtos, o usuário declara possuir idade legal para a compra e consumo.",
      "A distribuidora poderá adotar mecanismos razoáveis de verificação de idade e poderá recusar, cancelar ou não entregar pedidos quando houver suspeita de descumprimento dessa exigência.",
    ],
  },
  {
    title: "5. Produtos, preços e disponibilidade",
    paragraphs: [
      "Os preços e ofertas exibidos na plataforma podem ser alterados a qualquer momento, sem necessidade de aviso prévio, respeitados os pedidos já confirmados.",
      "Podem ocorrer divergências pontuais de estoque, imagem ilustrativa, embalagem, litragem, safra, fabricante ou outras características não essenciais, sem prejuízo das informações obrigatórias do produto.",
    ],
  },
  {
    title: "6. Pedidos, pagamento e confirmação",
    paragraphs: [
      "O envio do pedido pelo usuário representa uma proposta de compra. A confirmação definitiva depende da validação do pagamento, da análise antifraude quando aplicável e da disponibilidade em estoque.",
      "A Connect pode cancelar pedidos em caso de falha operacional, suspeita de fraude, erro evidente de precificação, impossibilidade logística ou descumprimento destes Termos, com estorno dos valores eventualmente pagos, quando cabível.",
    ],
  },
  {
    title: "7. Entrega, retirada e recebimento",
    paragraphs: [
      "Os prazos informados são estimativas e podem sofrer variação conforme região, transportadora, clima, volume de pedidos e outros fatores externos. O usuário deve fornecer endereço correto e assegurar condições adequadas para recebimento.",
      "No ato da entrega, poderá ser exigida identificação do recebedor. Em pedidos com bebidas alcoólicas, a entrega poderá ser recusada se o recebedor não comprovar maioridade ou se houver situação que contrarie a legislação aplicável.",
    ],
  },
  {
    title: "8. Cancelamentos, devoluções e arrependimento",
    paragraphs: [
      "As hipóteses de cancelamento, devolução, troca e exercício do direito de arrependimento observarão a legislação aplicável, inclusive o Código de Defesa do Consumidor, quando pertinente, bem como a natureza do produto e as condições sanitárias e de integridade da mercadoria.",
      "Produtos perecíveis, personalizados, violados ou fora das condições adequadas de armazenamento podem possuir regras específicas, desde que respeitados os direitos legais do cliente.",
    ],
  },
  {
    title: "9. Uso adequado da plataforma",
    paragraphs: [
      "É vedado utilizar a Connect para práticas ilícitas, tentativas de fraude, engenharia reversa, raspagem indevida de dados, disseminação de malware, interferência nos sistemas ou qualquer uso que possa comprometer a segurança da plataforma ou de terceiros.",
      "Também não é permitido reproduzir, copiar ou explorar comercialmente conteúdos, marcas, imagens, textos ou funcionalidades sem autorização prévia e expressa.",
    ],
  },
  {
    title: "10. Propriedade intelectual",
    paragraphs: [
      "A identidade visual, marcas, logotipos, layouts, textos, elementos gráficos, catálogos e demais materiais disponibilizados na plataforma pertencem à Connect ou aos respectivos titulares, sendo protegidos pela legislação aplicável.",
    ],
  },
  {
    title: "11. Limitação de responsabilidade",
    paragraphs: [
      "A Connect adotará medidas razoáveis para manter a plataforma em funcionamento, mas não garante disponibilidade contínua e ininterrupta. Eventuais indisponibilidades, falhas de terceiros, manutenções ou oscilações de internet podem ocorrer.",
      "A responsabilidade da plataforma será limitada nos termos da legislação aplicável, sem exclusão de direitos legalmente indisponíveis do consumidor.",
    ],
  },
  {
    title: "12. Privacidade e proteção de dados",
    paragraphs: [
      "O tratamento de dados pessoais realizado no contexto da plataforma segue a Política de Privacidade e a legislação brasileira aplicável, em especial a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).",
    ],
  },
  {
    title: "13. Alterações destes termos",
    paragraphs: [
      "A Connect pode atualizar estes Termos de Uso a qualquer momento para refletir mudanças legais, operacionais ou comerciais. A versão mais recente permanecerá disponível nesta página, com indicação da data de atualização.",
    ],
  },
  {
    title: "14. Contato",
    paragraphs: [
      "Para dúvidas, solicitações ou reclamações, o usuário pode utilizar os canais de atendimento informados no site, inclusive o e-mail suporte@connectvendas.app.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <section className="px-4 pb-12">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-custom-light-300 bg-white shadow-sm">
        <div className="bg-[linear-gradient(to_bottom,#080956_0%,#040228_100%)] px-6 py-10 md:px-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-montserrat text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a loja
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="mb-2 text-sm font-montserrat font-medium uppercase tracking-[0.2em] text-white/70">
                Documento legal
              </p>
              <h1 className="font-league-spartan text-4xl font-bold text-white md:text-5xl">
                Termos de Uso
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-montserrat leading-6 text-white/85 md:text-base">
                Condições gerais para uso da plataforma Connect e para compras realizadas
                no e-commerce da distribuidora.
              </p>
              <p className="mt-4 text-xs font-montserrat text-white/70">
                Última atualização: 12 de março de 2026
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="space-y-8">
            {sections.map((section) => (
              <div
                key={section.title}
                className="border-b border-custom-light-300 pb-8 last:border-b-0 last:pb-0"
              >
                <h2 className="mb-3 font-league-spartan text-2xl font-bold text-tints-french-blue">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-sm font-montserrat leading-7 text-custom-dark-1000 md:text-[15px]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
