import { listAccounts } from "@/server/services/accounts.service";
import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { deleteAccountAction } from "@/server/actions/admin.actions";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { LinkButton } from "@/components/ui/link-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AccountsPage() {
  const dict = await getDict();
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const accounts = await listAccounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.accounts.title}</h1>
        <LinkButton href="/accounts/new">{dict.accounts.newAccount}</LinkButton>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.code}</TableHead>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead>{dict.common.type}</TableHead>
            <TableHead>{dict.accounts.normalBalance}</TableHead>
            <TableHead>{dict.common.status}</TableHead>
            <TableHead className="text-right">{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-mono">{account.code}</TableCell>
              <TableCell>{account.name}</TableCell>
              <TableCell>{account.type}</TableCell>
              <TableCell>{account.normalBalance}</TableCell>
              <TableCell>
                <Badge variant={account.isActive ? "default" : "secondary"}>
                  {account.isActive ? dict.common.active : dict.common.inactive}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <LinkButton href={`/accounts/${account.id}/edit`} variant="ghost" size="sm">
                  {dict.common.edit}
                </LinkButton>
                {isAdmin && (
                  <ConfirmDeleteButton
                    action={deleteAccountAction.bind(null, account.id)}
                    description={`${account.code} — ${account.name}`}
                    size="xs"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {dict.accounts.noAccounts}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
