import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDict } from "@/lib/i18n/server";
import { listAuditLogs } from "@/server/services/audit.service";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AuditLogPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const dict = await getDict();
  const logs = await listAuditLogs();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{dict.admin.auditLog}</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dict.common.date}</TableHead>
            <TableHead>{dict.admin.action}</TableHead>
            <TableHead>{dict.common.by}</TableHead>
            <TableHead>{dict.admin.detail}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {log.createdAt.toLocaleString("id-ID")}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{log.action}</Badge>
              </TableCell>
              <TableCell>{log.user.name}</TableCell>
              <TableCell className="max-w-xl">
                <pre className="whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
                  {log.detail}
                </pre>
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {dict.admin.noAuditLogs}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
