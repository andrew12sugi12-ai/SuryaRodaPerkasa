import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getAccount } from "@/server/services/accounts.service";
import { AccountForm } from "@/components/accounts/account-form";

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const dict = await getDict();
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.accounts.editAccount}</h1>
      <AccountForm
        accountId={account.id}
        defaultValues={{
          code: account.code,
          name: account.name,
          type: account.type,
          normalBalance: account.normalBalance,
          expenseCategory: account.expenseCategory ?? undefined,
          isLongTerm: account.isLongTerm,
          isActive: account.isActive,
        }}
      />
    </div>
  );
}
