import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { listUsers } from "@/server/services/users.service";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { EditUserDialog, ResetPasswordDialog } from "@/components/users/user-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function UsersPage() {
  const dict = await getDict();
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.users.title}</h1>
        <CreateUserDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.name}</TableHead>
            <TableHead>{dict.common.email}</TableHead>
            <TableHead>{dict.users.role}</TableHead>
            <TableHead>{dict.common.status}</TableHead>
            <TableHead>{dict.users.created}</TableHead>
            <TableHead className="text-right">{dict.common.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? dict.common.active : dict.common.inactive}
                </Badge>
              </TableCell>
              <TableCell>{user.createdAt.toLocaleDateString("id-ID")}</TableCell>
              <TableCell className="text-right">
                <EditUserDialog
                  user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                  }}
                />
                <ResetPasswordDialog
                  user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isActive: user.isActive,
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
