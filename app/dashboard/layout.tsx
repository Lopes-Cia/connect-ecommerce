import Header from "@/components/layout/Header";
import DashboardSidebar from "@/components/layout/DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="flex min-h-screen">
        <DashboardSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
