import Header from "@/components/layout/Header";
import CategoryHeader from "@/components/layout/CategoryHeader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <CategoryHeader />
      <main>
        {children}
      </main>
    </div>
  );
}
