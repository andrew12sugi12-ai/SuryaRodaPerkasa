"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { dict } = useI18n();
  const t = dict.nav;

  const sections = [
    {
      label: t.overview,
      links: [{ href: "/dashboard", label: t.dashboard }],
    },
    {
      label: t.ledger,
      links: [
        { href: "/accounts", label: t.chartOfAccounts },
        { href: "/journal-entries", label: t.journalEntries },
      ],
    },
    {
      label: t.inventory,
      links: [{ href: "/products", label: t.products }],
    },
    {
      label: t.transactions,
      links: [
        { href: "/purchases", label: t.purchases },
        { href: "/sales", label: t.sales },
        { href: "/expenses", label: t.expenses },
        { href: "/payments", label: t.payments },
      ],
    },
    {
      label: t.contacts,
      links: [
        { href: "/customers", label: t.customers },
        { href: "/suppliers", label: t.suppliers },
      ],
    },
    {
      label: t.reports,
      links: [
        { href: "/reports/trial-balance", label: t.trialBalance },
        { href: "/reports/income-statement", label: t.incomeStatement },
        { href: "/reports/balance-sheet", label: t.balanceSheet },
        { href: "/reports/cash-flow", label: t.cashFlow },
      ],
    },
    ...(isAdmin
      ? [
          {
            label: t.admin,
            links: [
              { href: "/users", label: t.users },
              { href: "/audit-log", label: dict.admin.auditLog },
              { href: "/period-lock", label: dict.admin.periodLock },
              { href: "/reset-data", label: dict.reset.title },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-muted/20 p-4 md:block">
      <div className="mb-6 px-2">
        <span className="text-lg font-semibold tracking-tight">
          Indocycle
        </span>
      </div>
      <nav className="space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.links.map((link) => {
                const isActive =
                  pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    {link.label}
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
