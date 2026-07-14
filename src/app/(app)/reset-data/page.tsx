import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDict } from "@/lib/i18n/server";
import { ResetDataForm } from "@/components/admin/reset-data-form";

export default async function ResetDataPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const dict = await getDict();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.reset.title}</h1>
      <ResetDataForm />
    </div>
  );
}
