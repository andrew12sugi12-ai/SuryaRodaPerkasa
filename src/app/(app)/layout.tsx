import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-1">
      <div className="print:hidden">
        <Sidebar isAdmin={user?.role === "ADMIN"} />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="print:hidden">
          <Header userName={user?.name ?? ""} userRole={user?.role ?? ""} />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
