import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade | Connect",
  description: "Política de Privacidade da plataforma Connect.",
};

const sections = [
  {
    title: "1. Introdução",
    paragraphs: [
      "Esta Política de Privacidade descreve como a Connect coleta, utiliza, compartilha e protege dados pessoais no contexto de seu e-commerce de distribuidora de bebidas e produtos relacionados.",
      "O tratamento de dados observa a legislação brasileira aplicável, especialmente a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).",
    ],
  },
  {
    title: "2. Dados pessoais que podemos coletar",
    paragraphs: [
      "Podemos coletar dados de identificação e contato, como nome, e-mail, telefone, CPF, data de nascimento, endereço de entrega e faturamento, além de informações de login e histórico de pedidos.",
      "Também podemos tratar dados de navegação e uso, como endereço IP, dispositivo, navegador, cookies, páginas acessadas, horário de acesso e interações com a plataforma.",
    ],
  },
  {
    title: "3. Finalidades do tratamento",
    paragraphs: [
      "Utilizamos os dados para viabilizar cadastro, autenticação, processamento de pedidos, entrega, faturamento, atendimento ao cliente, prevenção a fraude, suporte técnico e cumprimento de obrigações legais e regulatórias.",
      "Os dados também podem ser usados para comunicações sobre status do pedido, ações promocionais, melhoria da experiência de compra, análise de desempenho e segurança da plataforma, respeitadas as bases legais aplicáveis.",
    ],
  },
  {
    title: "4. Bases legais utilizadas",
    paragraphs: [
      "O tratamento de dados pessoais pode ocorrer com fundamento na execução de contrato ou de procedimentos preliminares relacionados à compra, no cumprimento de obrigações legais, no exercício regular de direitos, no legítimo interesse e, quando necessário, no consentimento do titular.",
    ],
  },
  {
    title: "5. Compartilhamento de dados",
    paragraphs: [
      "Os dados podem ser compartilhados com operadores e parceiros essenciais à operação do e-commerce, como provedores de hospedagem, meios de pagamento, plataformas antifraude, integradores, transportadoras, ferramentas de atendimento e prestadores de suporte tecnológico.",
      "A Connect pode ainda compartilhar dados quando houver determinação legal, requisição de autoridade competente ou necessidade de defesa em processos judiciais, administrativos ou arbitrais.",
    ],
  },
  {
    title: "6. Cookies e tecnologias semelhantes",
    paragraphs: [
      "A plataforma pode utilizar cookies e tecnologias semelhantes para autenticar sessões, lembrar preferências, medir audiência, aprimorar desempenho e oferecer funcionalidades essenciais ao funcionamento do site.",
      "O usuário pode gerenciar parte dessas preferências em seu navegador, ciente de que a desativação de determinados cookies pode impactar a experiência e algumas funcionalidades.",
    ],
  },
  {
    title: "7. Retenção e armazenamento",
    paragraphs: [
      "Os dados pessoais serão armazenados pelo tempo necessário para cumprir as finalidades desta Política, atender exigências legais, regulatórias e fiscais, resguardar direitos da Connect e permitir o exercício regular de defesa.",
      "Encerrado o período de retenção aplicável, os dados poderão ser eliminados, anonimizados ou mantidos de forma bloqueada, conforme a legislação vigente.",
    ],
  },
  {
    title: "8. Segurança da informação",
    paragraphs: [
      "A Connect adota medidas técnicas e administrativas razoáveis para proteger os dados pessoais contra acessos não autorizados, perda, alteração, divulgação ou destruição indevida.",
      "Apesar dos esforços de segurança, nenhum ambiente digital é completamente livre de riscos. Por isso, o usuário também deve proteger suas credenciais e adotar boas práticas de segurança.",
    ],
  },
  {
    title: "9. Direitos do titular",
    paragraphs: [
      "Nos termos da LGPD, o titular pode solicitar confirmação da existência de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamentos, revogação do consentimento e revisão de decisões automatizadas, quando aplicável.",
      "As solicitações podem ser enviadas pelos canais de atendimento disponibilizados pela Connect, e serão analisadas nos limites e prazos previstos na legislação.",
    ],
  },
  {
    title: "10. Menores de idade e venda de bebidas alcoólicas",
    paragraphs: [
      "A plataforma não se destina à compra de bebidas alcoólicas por menores de 18 anos. Sempre que aplicável, a Connect poderá adotar mecanismos para verificação de idade e para recusa de pedidos em desconformidade com a legislação.",
    ],
  },
  {
    title: "11. Atualizações desta política",
    paragraphs: [
      "Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças legais, regulatórias, tecnológicas ou operacionais. A versão vigente permanecerá acessível nesta página com a data da última atualização.",
    ],
  },
  {
    title: "12. Contato sobre privacidade",
    paragraphs: [
      "Para esclarecer dúvidas sobre privacidade, proteção de dados ou para exercer direitos previstos na LGPD, o usuário pode entrar em contato pelos canais oficiais informados no site, inclusive o e-mail suporte@connectvendas.app.",
    ],
  },
] as const;

export default function PrivacyPage() {
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
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="mb-2 text-sm font-montserrat font-medium uppercase tracking-[0.2em] text-white/70">
                Proteção de dados
              </p>
              <h1 className="font-league-spartan text-4xl font-bold text-white md:text-5xl">
                Política de Privacidade
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-montserrat leading-6 text-white/85 md:text-base">
                Informações sobre coleta, uso, compartilhamento e proteção de dados
                pessoais na plataforma Connect.
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
