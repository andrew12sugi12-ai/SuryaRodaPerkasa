import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildMonthlyWorkbook,
  buildSingleReport,
  type SingleReport,
} from "@/server/services/excel-export.service";
import { reportFirstOfMonth, reportToday } from "@/lib/report-dates";

export const runtime = "nodejs";

const COMPANY = "PT Surya Roda Perkasa";
const SINGLE: SingleReport[] = ["income", "balance", "cashflow", "performance"];

function parseISO(value: string | null, fallback: string, endOfDay = false): Date {
  const iso = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
  return new Date(`${iso}T${endOfDay ? "23:59:59" : "00:00:00"}`);
}

export async function GET(req: NextRequest) {
  // Defence in depth — middleware already gates /api, but never serve data unauthenticated.
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "combined";
  const start = parseISO(sp.get("start"), reportFirstOfMonth());
  const end = parseISO(sp.get("end"), reportToday(), true);
  const monthTag = end.toLocaleDateString("id-ID", { month: "short", year: "numeric" }).replace(/\s/g, "_");

  let buffer: Buffer;
  let filename: string;

  if (type === "combined") {
    buffer = await buildMonthlyWorkbook(start, end, COMPANY);
    filename = `Laporan_Bulanan_${monthTag}.xlsx`;
  } else if ((SINGLE as string[]).includes(type)) {
    buffer = await buildSingleReport(type as SingleReport, COMPANY, start, end);
    const names: Record<SingleReport, string> = {
      income: "Laba_Rugi",
      balance: "Neraca",
      cashflow: "Arus_Kas",
      performance: "Kinerja",
    };
    filename = `${names[type as SingleReport]}_${monthTag}.xlsx`;
  } else {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
