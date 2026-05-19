import type { Metadata } from "next";
import { Montserrat, League_Spartan } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import AiChatMount from "@/components/ai/AiChatMount";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "600"],
});

const leagueSpartan = League_Spartan({
  variable: "--font-league-spartan",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "E-commerce Connect",
  description: "Os melhores produtos do Brasil!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fonte = String(process.env.NEXT_PUBLIC_FONTE ?? "").trim();
  const catalogFonte = String(process.env.NEXT_PUBLIC_CATALOGO_FONTE ?? "").trim();

  return (
    <html lang="pt-br" data-fonte={fonte} data-catalog-fonte={catalogFonte}>
      <body
        className={`${montserrat.variable} ${leagueSpartan.variable} antialiased flex flex-col min-h-screen`}
      >
        <AppProviders>
          {children}
          <AiChatMount />
        </AppProviders>
      </body>
    </html>
  );
}
