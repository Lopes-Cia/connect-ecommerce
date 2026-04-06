import Header from "@/components/layout/Header";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { requireAuth } from "@/lib/auth/protected";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

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
