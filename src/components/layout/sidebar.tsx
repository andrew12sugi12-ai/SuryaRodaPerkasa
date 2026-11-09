"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  LayoutDashboard,
  BookOpen,
  NotebookPen,
  Package,
  ShoppingCart,
  Receipt,
  Undo2,
  Wallet,
  Banknote,
  Users,
  Factory,
  UserRound,
  BarChart3,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  ArrowLeftRight,
  ClipboardList,
  CalendarRange,
  UserCog,
  ScrollText,
  Lock,
  RotateCcw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const t = dict.nav;

  const sections: {
    label: string;
    links: { href: string; label: string; icon: LucideIcon }[];
  }[] = [
    {
      label: t.overview,
      links: [{ href: "/dashboard", label: t.dashboard, icon: LayoutDashboard }],
    },
    {
      label: t.ledger,
      links: [
        { href: "/accounts", label: t.chartOfAccounts, icon: BookOpen },
        { href: "/journal-entries", label: t.journalEntries, icon: NotebookPen },
      ],
    },
    {
      label: t.inventory,
      links: [{ href: "/products", label: t.products, icon: Package }],
    },
    {
      label: t.transactions,
      links: [
        { href: "/purchases", label: t.purchases, icon: ShoppingCart },
        { href: "/sales", label: t.sales, icon: Receipt },
        { href: "/returns", label: dict.returns.newReturn, icon: Undo2 },
        { href: "/expenses", label: t.expenses, icon: Wallet },
        { href: "/payments", label: t.payments, icon: Banknote },
      ],
    },
    {
      label: t.contacts,
      links: [
        { href: "/customers", label: t.customers, icon: Users },
        { href: "/suppliers", label: t.suppliers, icon: Factory },
        { href: "/salesmen", label: t.salesmen, icon: UserRound },
      ],
    },
    {
      label: t.reports,
      links: [
        { href: "/reports/analytics", label: t.analytics, icon: BarChart3 },
        { href: "/reports/trial-balance", label: t.trialBalance, icon: Scale },
        { href: "/reports/income-statement", label: t.incomeStatement, icon: TrendingUp },
        { href: "/reports/balance-sheet", label: t.balanceSheet, icon: FileSpreadsheet },
        { href: "/reports/cash-flow", label: t.cashFlow, icon: ArrowLeftRight },
        { href: "/reports/inventory", label: t.inventoryReport, icon: ClipboardList },
        { href: "/reports/monthly", label: t.monthlyReports, icon: CalendarRange },
      ],
    },
    {
      label: t.account,
      links: [{ href: "/security", label: t.security, icon: ShieldCheck }],
    },
    ...(isAdmin
      ? [
          {
            label: t.admin,
            links: [
              { href: "/users", label: t.users, icon: UserCog },
              { href: "/audit-log", label: dict.admin.auditLog, icon: ScrollText },
              { href: "/period-lock", label: dict.admin.periodLock, icon: Lock },
              { href: "/reset-data", label: dict.reset.title, icon: RotateCcw },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-muted/20 md:flex md:flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bike className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Surya Roda Perkasa</p>
          <p className="text-xs text-muted-foreground">Ledger</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const isActive =
                  pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
