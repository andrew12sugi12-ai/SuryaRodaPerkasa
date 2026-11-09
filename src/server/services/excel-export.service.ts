import ExcelJS from "exceljs";
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
} from "@/server/services/reports.service";
import { getAnalytics } from "@/server/services/analytics.service";

/**
 * Server-side Excel export for the monthly reports. Generic, formal styling
 * (Calibri, neutral grey headers, gridlines on, IDR formatting). Mirrors the
 * approved mock. Builds either one report or a combined 5-sheet workbook.
 */

const FONT = "Calibri";
const IDR = '"Rp" #,##0;("Rp" #,##0);"-"';
const PCT = "0.0%";

const C = {
  white: "FFFFFFFF",
  black: "FF000000",
  hdr: "FF404040",
  band: "FFD9D9D9",
  mute: "FF595959",
};

type Rows = Array<
  | { kind: "sec"; label: string }
  | { kind: "ln"; label: string; val: number }
  | { kind: "tot" | "dbl"; label: string; val: number }
>;

function fmtDMY(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function banner(ws: ExcelJS.Worksheet, company: string, title: string, period: string, cols = 2) {
  const last = String.fromCharCode(64 + cols);
  ws.mergeCells(`A1:${last}1`);
  ws.mergeCells(`A2:${last}2`);
  ws.mergeCells(`A3:${last}3`);
  const rows: Array<[number, string, number, boolean]> = [
    [1, company, 16, true],
    [2, title, 11, true],
    [3, period, 10, false],
  ];
  for (const [r, text, size, bold] of rows) {
    const cell = ws.getCell(`A${r}`);
    cell.value = text;
    cell.font = { name: FONT, size, bold, color: { argb: C.white } };
    cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    for (let c = 1; c <= cols; c++) {
      ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.hdr } };
    }
  }
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 18;
  ws.getRow(3).height = 16;
}

/** Writes a label/value statement (sections, lines, subtotals, grand totals). */
function statement(ws: ExcelJS.Worksheet, rows: Rows, startRow = 5) {
  ws.columns = [{ width: 46 }, { width: 22 }];
  ws.views = [{ showGridLines: true, state: "frozen", ySplit: 4 }];
  let r = startRow;
  for (const row of rows) {
    const labelCell = ws.getCell(r, 1);
    const valCell = ws.getCell(r, 2);
    labelCell.value = row.label;
    if (row.kind === "sec") {
      labelCell.font = { name: FONT, size: 10, bold: true, color: { argb: C.black } };
      labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.band } };
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.band } };
    } else if (row.kind === "ln") {
      labelCell.font = { name: FONT, size: 11, color: { argb: C.black } };
      labelCell.alignment = { indent: 2 };
      valCell.value = row.val;
      valCell.numFmt = IDR;
      valCell.font = { name: FONT, size: 11, color: { argb: C.black } };
      valCell.alignment = { horizontal: "right" };
    } else {
      labelCell.font = { name: FONT, size: 11, bold: true, color: { argb: C.black } };
      valCell.value = row.val;
      valCell.numFmt = IDR;
      valCell.font = { name: FONT, size: 11, bold: true, color: { argb: C.black } };
      valCell.alignment = { horizontal: "right" };
      const border: Partial<ExcelJS.Borders> =
        row.kind === "dbl"
          ? { top: { style: "thin", color: { argb: C.black } }, bottom: { style: "double", color: { argb: C.black } } }
          : { top: { style: "thin", color: { argb: C.black } } };
      labelCell.border = border;
      valCell.border = border;
    }
    r++;
  }
  return r;
}

// ---------- individual sheets ----------

export async function addIncomeSheet(wb: ExcelJS.Workbook, company: string, start: Date, end: Date) {
  const d = await getIncomeStatement(start, end);
  const ws = wb.addWorksheet("Laba Rugi");
  banner(ws, company, "Laporan Laba Rugi", `${fmtDMY(start)} — ${fmtDMY(end)}`);
  const rows: Rows = [{ kind: "sec", label: "PENDAPATAN" }];
  for (const x of d.revenueRows) rows.push({ kind: "ln", label: x.name, val: x.amount });
  rows.push({ kind: "tot", label: "Total Pendapatan", val: d.revenue });
  rows.push({ kind: "sec", label: "BEBAN POKOK PENJUALAN" });
  for (const x of d.cogsRows) rows.push({ kind: "ln", label: x.name, val: x.amount });
  rows.push({ kind: "tot", label: "Total Beban Pokok", val: d.cogs });
  rows.push({ kind: "tot", label: "LABA KOTOR", val: d.grossProfit });
  const opGroups: Array<[string, typeof d.operationalRows]> = [
    ["BEBAN OPERASIONAL", d.operationalRows],
    ["BEBAN TETAP", d.fixedRows],
    ["BEBAN PENJUALAN", d.salesExpenseRows],
    ["BEBAN LAIN-LAIN", d.otherRows],
  ];
  for (const [label, group] of opGroups) {
    if (group.length === 0) continue;
    rows.push({ kind: "sec", label });
    for (const x of group) rows.push({ kind: "ln", label: x.name, val: x.amount });
  }
  rows.push({ kind: "tot", label: "Total Beban Operasional", val: d.operatingExpenses });
  rows.push({ kind: "dbl", label: "LABA BERSIH", val: d.netIncome });
  statement(ws, rows);
  return ws;
}

export async function addBalanceSheet(wb: ExcelJS.Workbook, company: string, asOf: Date) {
  const d = await getBalanceSheet(asOf);
  const ws = wb.addWorksheet("Neraca");
  banner(ws, company, "Neraca (Balance Sheet)", `Per ${fmtDMY(asOf)}`);
  const rows: Rows = [{ kind: "sec", label: "ASET LANCAR" }];
  for (const x of d.cashBankRows) rows.push({ kind: "ln", label: x.name, val: x.balance });
  for (const x of d.otherCurrentAssetRows) rows.push({ kind: "ln", label: x.name, val: x.balance });
  rows.push({ kind: "tot", label: "Total Aset Lancar", val: d.totalCurrentAssets });
  if (d.longTermAssetRows.length) {
    rows.push({ kind: "sec", label: "ASET TIDAK LANCAR" });
    for (const x of d.longTermAssetRows) rows.push({ kind: "ln", label: x.name, val: x.balance });
    rows.push({ kind: "tot", label: "Total Aset Tidak Lancar", val: d.totalLongTermAssets });
  }
  rows.push({ kind: "dbl", label: "TOTAL ASET", val: d.totalAssets });
  rows.push({ kind: "sec", label: "LIABILITAS" });
  for (const x of d.currentLiabilityRows) rows.push({ kind: "ln", label: x.name, val: x.balance });
  for (const x of d.longTermLiabilityRows) rows.push({ kind: "ln", label: x.name, val: x.balance });
  rows.push({ kind: "tot", label: "Total Liabilitas", val: d.totalLiabilities });
  rows.push({ kind: "sec", label: "EKUITAS" });
  for (const x of d.equityRows) rows.push({ kind: "ln", label: x.name, val: x.balance });
  rows.push({ kind: "ln", label: "Laba Periode Berjalan", val: d.currentEarnings });
  rows.push({ kind: "tot", label: "Total Ekuitas", val: d.totalEquity });
  rows.push({ kind: "dbl", label: "TOTAL LIABILITAS & EKUITAS", val: d.totalLiabilities + d.totalEquity });
  statement(ws, rows);
  return ws;
}

export async function addCashFlowSheet(wb: ExcelJS.Workbook, company: string, start: Date, end: Date) {
  const d = await getCashFlow(start, end);
  const ws = wb.addWorksheet("Arus Kas");
  banner(ws, company, "Laporan Arus Kas", `${fmtDMY(start)} — ${fmtDMY(end)}`);
  const rows: Rows = [
    { kind: "tot", label: "Saldo Kas Awal", val: d.openingBalance },
    { kind: "sec", label: "ARUS KAS DARI OPERASI" },
    { kind: "ln", label: "Penjualan Tunai", val: d.salesReceipts },
    { kind: "ln", label: "Penerimaan dari Pelanggan", val: d.customerReceipts },
    { kind: "ln", label: "Pembayaran ke Pemasok", val: d.supplierPayments },
    { kind: "ln", label: "Pembayaran Pembelian", val: d.purchasePayments },
    { kind: "ln", label: "Pembayaran Beban Operasi", val: d.expensePayments },
    { kind: "tot", label: "Kas Bersih dari Operasi", val: d.netOperating },
    { kind: "sec", label: "ARUS KAS LAINNYA" },
    { kind: "ln", label: "Mutasi Lain (jurnal manual)", val: d.otherMovements },
    { kind: "tot", label: "Kenaikan (Penurunan) Kas", val: d.netChange },
    { kind: "dbl", label: "SALDO KAS AKHIR", val: d.closingBalance },
  ];
  statement(ws, rows);
  return ws;
}

export async function addPerformanceSheet(wb: ExcelJS.Workbook, company: string, start: Date, end: Date) {
  const d = await getAnalytics(start, end);
  const ws = wb.addWorksheet("Kinerja");
  banner(ws, company, "Kinerja Penjualan", `${fmtDMY(start)} — ${fmtDMY(end)}`, 7);
  ws.columns = [{ width: 22 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 16 }, { width: 10 }, { width: 12 }];
  ws.views = [{ showGridLines: true, state: "frozen", ySplit: 5 }];
  const head = ["Salesman", "Toko", "Faktur", "Pendapatan", "Laba Kotor", "Margin", "Pencapaian"];
  const hr = 5;
  head.forEach((h, i) => {
    const cell = ws.getCell(hr, i + 1);
    cell.value = h;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.hdr } };
    cell.alignment = { horizontal: i > 1 ? "right" : "left" };
  });
  let r = hr + 1;
  const firstData = r;
  for (const s of d.salesmanPerformance) {
    ws.getCell(r, 1).value = s.name;
    ws.getCell(r, 1).font = { name: FONT, size: 11 };
    ws.getCell(r, 2).value = s.tokoCount;
    ws.getCell(r, 3).value = s.invoices;
    ws.getCell(r, 4).value = s.revenue;
    ws.getCell(r, 5).value = s.grossProfit;
    ws.getCell(r, 6).value = s.marginPct / 100;
    ws.getCell(r, 7).value = s.attainmentPct === null ? null : s.attainmentPct / 100;
    ws.getCell(r, 4).numFmt = IDR;
    ws.getCell(r, 5).numFmt = IDR;
    ws.getCell(r, 6).numFmt = PCT;
    ws.getCell(r, 7).numFmt = PCT;
    const attained = s.attainmentPct !== null && s.attainmentPct >= 100;
    for (let c = 2; c <= 7; c++) ws.getCell(r, c).alignment = { horizontal: "right" };
    ws.getCell(r, 7).font = { name: FONT, size: 11, bold: attained };
    r++;
  }
  const lastData = r - 1;
  if (d.salesmanPerformance.length) {
    ws.getCell(r, 1).value = "TOTAL";
    ws.getCell(r, 1).font = { name: FONT, size: 11, bold: true };
    ws.getCell(r, 2).value = { formula: `SUM(B${firstData}:B${lastData})` };
    ws.getCell(r, 3).value = { formula: `SUM(C${firstData}:C${lastData})` };
    ws.getCell(r, 4).value = { formula: `SUM(D${firstData}:D${lastData})` };
    ws.getCell(r, 5).value = { formula: `SUM(E${firstData}:E${lastData})` };
    ws.getCell(r, 4).numFmt = IDR;
    ws.getCell(r, 5).numFmt = IDR;
    for (let c = 2; c <= 5; c++) {
      ws.getCell(r, c).font = { name: FONT, size: 11, bold: true };
      ws.getCell(r, c).alignment = { horizontal: "right" };
      ws.getCell(r, c).border = { top: { style: "thin", color: { argb: C.black } } };
    }
    ws.getCell(r, 1).border = { top: { style: "thin", color: { argb: C.black } } };
  }
  return ws;
}

function addSummarySheet(
  wb: ExcelJS.Workbook,
  company: string,
  start: Date,
  end: Date,
  k: { revenue: number; grossProfit: number; netIncome: number; receivable: number; cashEnd: number }
) {
  const ws = wb.addWorksheet("Ringkasan");
  ws.columns = [{ width: 3 }, { width: 34 }, { width: 22 }, { width: 26 }];
  ws.views = [{ showGridLines: true }];
  banner(ws, company, "Laporan Bulanan — Ringkasan", `Periode: ${fmtDMY(start)} — ${fmtDMY(end)}`, 4);
  let r = 5;
  ws.getCell(r, 2).value = "Ikhtisar Bulan Ini";
  ws.getCell(r, 2).font = { name: FONT, size: 12, bold: true };
  r++;
  const margin = k.revenue > 0 ? (k.grossProfit / k.revenue) * 100 : 0;
  const niMargin = k.revenue > 0 ? (k.netIncome / k.revenue) * 100 : 0;
  const kpis: Array<[string, number, string]> = [
    ["Pendapatan", k.revenue, ""],
    ["Laba Kotor", k.grossProfit, `Margin ${margin.toFixed(1)}%`],
    ["Laba Bersih", k.netIncome, `Margin ${niMargin.toFixed(1)}%`],
    ["Piutang Usaha", k.receivable, ""],
    ["Kas & Bank (akhir)", k.cashEnd, ""],
  ];
  for (const [label, val, sub] of kpis) {
    ws.getCell(r, 2).value = label;
    ws.getCell(r, 2).font = { name: FONT, size: 11, bold: true };
    ws.getCell(r, 3).value = val;
    ws.getCell(r, 3).numFmt = IDR;
    ws.getCell(r, 3).font = { name: FONT, size: 11, bold: true };
    ws.getCell(r, 3).alignment = { horizontal: "right" };
    ws.getCell(r, 4).value = sub;
    ws.getCell(r, 4).font = { name: FONT, size: 10, italic: true, color: { argb: C.mute } };
    r++;
  }
  r++;
  ws.getCell(r, 2).value = "Isi laporan (lihat tab di bawah):";
  ws.getCell(r, 2).font = { name: FONT, size: 11, bold: true };
  r++;
  for (const name of ["Laba Rugi", "Neraca", "Arus Kas", "Kinerja Penjualan"]) {
    ws.getCell(r, 2).value = "•  " + name;
    ws.getCell(r, 2).font = { name: FONT, size: 11 };
    r++;
  }
  return ws;
}

// ---------- public builders ----------

/** Combined 5-sheet monthly workbook. */
export async function buildMonthlyWorkbook(start: Date, end: Date, company: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SRP Ledger";
  // Data for the summary cover (income + balance give the headline KPIs).
  const [income, balance] = await Promise.all([getIncomeStatement(start, end), getBalanceSheet(end)]);
  const receivable = balance.receivablesDetail.reduce((s, x) => s + x.amount, 0);
  const cashEnd = balance.cashBankTotal;
  addSummarySheet(wb, company, start, end, {
    revenue: income.revenue,
    grossProfit: income.grossProfit,
    netIncome: income.netIncome,
    receivable,
    cashEnd,
  });
  await addIncomeSheet(wb, company, start, end);
  await addBalanceSheet(wb, company, end);
  await addCashFlowSheet(wb, company, start, end);
  await addPerformanceSheet(wb, company, start, end);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export type SingleReport = "income" | "balance" | "cashflow" | "performance";

/** Single-report workbook (one sheet). */
export async function buildSingleReport(
  type: SingleReport,
  company: string,
  start: Date,
  end: Date
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SRP Ledger";
  if (type === "income") await addIncomeSheet(wb, company, start, end);
  else if (type === "balance") await addBalanceSheet(wb, company, end);
  else if (type === "cashflow") await addCashFlowSheet(wb, company, start, end);
  else await addPerformanceSheet(wb, company, start, end);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
