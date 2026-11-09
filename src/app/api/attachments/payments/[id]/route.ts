import path from "path";
import fs from "fs/promises";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PAYMENTS_DIR } from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { attachmentPath: true, attachmentName: true, attachmentType: true },
  });
  if (!payment?.attachmentPath) return new Response("Not found", { status: 404 });

  // Resolve within the payments dir only (no path traversal).
  const safe = path.basename(payment.attachmentPath);
  const filePath = path.join(PAYMENTS_DIR, safe);
  try {
    const buffer = await fs.readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": payment.attachmentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${payment.attachmentName || safe}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
