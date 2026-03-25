import Header from "@/components/layout/Header";
import CategoryHeader from "@/components/layout/CategoryHeader";
import Footer from "@/components/layout/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <CategoryHeader />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
