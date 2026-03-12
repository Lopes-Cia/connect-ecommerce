import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryHeader from "@/components/layout/CategoryHeader";
import CepHeader from "@/components/layout/CepHeader";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <CategoryHeader />
      <CepHeader />
      <main className="md:max-w-[var(--width-content-md)] lg:max-w-[var(--width-content-lg)] mt-6 md:mx-auto xs:px-4 sm:px-6 md:px-8 2xl:px-0">
        {children}
      </main>
      <Footer />
    </div>
  );
}
