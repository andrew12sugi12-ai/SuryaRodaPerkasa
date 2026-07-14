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
      <Sidebar isAdmin={user?.role === "ADMIN"} />
      <div className="flex flex-1 flex-col">
        <Header userName={user?.name ?? ""} userRole={user?.role ?? ""} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
