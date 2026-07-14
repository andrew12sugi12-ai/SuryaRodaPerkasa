import { AccountForm } from "@/components/accounts/account-form";
import { getDict } from "@/lib/i18n/server";

export default async function NewAccountPage() {
  const dict = await getDict();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.accounts.newAccount}</h1>
      <AccountForm />
    </div>
  );
}
