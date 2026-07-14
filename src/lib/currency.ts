import type { Prisma } from "@/generated/prisma";

type Money = number | string | Prisma.Decimal | null | undefined;

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIDR(amount: Money): string {
  if (amount === null || amount === undefined) return idrFormatter.format(0);
  const num = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  return idrFormatter.format(Number.isFinite(num) ? num : 0);
}

export function toNumber(amount: Money): number {
  if (amount === null || amount === undefined) return 0;
  const num = typeof amount === "object" ? Number(amount.toString()) : Number(amount);
  return Number.isFinite(num) ? num : 0;
}
