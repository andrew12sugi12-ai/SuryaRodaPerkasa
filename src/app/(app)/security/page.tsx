import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDict } from "@/lib/i18n/server";
import { TwoFactorPanel } from "@/components/security/two-factor-panel";

export default async function SecurityPage() {
  const session = await auth();
  const dict = await getDict();
  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorEnabled: true },
      })
    : null;

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.security.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.security.subtitle}</p>
      </div>
      <TwoFactorPanel enabled={user?.twoFactorEnabled ?? false} />
    </div>
  );
}
