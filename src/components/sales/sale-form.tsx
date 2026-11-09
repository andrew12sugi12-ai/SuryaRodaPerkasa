"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { AlertTriangle, Trash2 } from "lucide-react";

import { saleSchema, type SaleInput } from "@/lib/validation/sale";
import { recordSaleAction } from "@/server/actions/sales.actions";
import { updateSaleAction } from "@/server/actions/admin.actions";
import { formatIDR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Option = { id: string; label: string };
type ProductOption = Option & { quantityOnHand: number };
type CreditInfo = {
  creditLimit: number;
  cashOnly: boolean;
  termDays: number;
  receivable: number;
  hasOverdue: boolean;
};

export function SaleForm({
  customers,
  accounts,
  products,
  salesmen = [],
  customerSalesman = {},
  saleId,
  defaultValues,
  creditMap = {},
  arAccountId,
}: {
  customers: Option[];
  accounts: Option[];
  products: ProductOption[];
  salesmen?: Option[];
  customerSalesman?: Record<string, string>;
  saleId?: string;
  defaultValues?: SaleInput;
  creditMap?: Record<string, CreditInfo>;
  arAccountId?: string;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const c = dict.credit;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SaleInput>({
    resolver: zodResolver(saleSchema),
    defaultValues: defaultValues ?? {
      date: new Date(),
      customerId: "",
      salesmanId: "",
      paymentAccountId: "",
      reference: "",
      lines: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const SALESMAN_NONE = "__none__";
  const salesmanItems = {
    [SALESMAN_NONE]: dict.contacts.noSalesman,
    ...Object.fromEntries(salesmen.map((s) => [s.id, s.label])),
  };

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");
  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const watchedCustomerId = form.watch("customerId");
  const watchedAccountId = form.watch("paymentAccountId");
  const watchedDate = form.watch("date");
  const isCreditSale = !!arAccountId && watchedAccountId === arAccountId;
  const credit = creditMap[watchedCustomerId];

  // Credit-control evaluation (mirrors the server guard in credit.service).
  const creditReasons: string[] = [];
  if (isCreditSale && credit) {
    if (credit.cashOnly) creditReasons.push(c.reasonCashOnly);
    if (credit.creditLimit > 0 && credit.receivable + total > credit.creditLimit + 0.005)
      creditReasons.push(c.reasonOverLimit);
    if (credit.hasOverdue) creditReasons.push(c.reasonOverdue);
  }
  const hasCreditWarning = creditReasons.length > 0;

  // Auto-fill the due date from the toko's tempo (termDays) for credit sales,
  // unless the user has already set one.
  useEffect(() => {
    if (!isCreditSale || !credit || credit.termDays <= 0) return;
    if (form.getValues("dueDate")) return;
    const base = watchedDate instanceof Date ? watchedDate : new Date();
    const due = new Date(base);
    due.setDate(due.getDate() + credit.termDays);
    form.setValue("dueDate", due);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCustomerId, watchedAccountId]);

  // Default the salesman to the toko's assigned rep when none is chosen yet.
  // Leaves an existing choice (or an edited sale's salesman) untouched.
  useEffect(() => {
    if (form.getValues("salesmanId")) return;
    const defaultSalesman = customerSalesman[watchedCustomerId];
    if (defaultSalesman) form.setValue("salesmanId", defaultSalesman);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCustomerId]);

  const customerItems = Object.fromEntries(customers.map((c) => [c.id, c.label]));
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.label]));
  const productItems = Object.fromEntries(products.map((p) => [p.id, p.label]));
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  async function onSubmit(values: SaleInput) {
    // Credit-sale guard: make the user confirm before breaching a toko's limits.
    let override = false;
    if (!saleId && hasCreditWarning) {
      const ok = window.confirm(`${c.warningTitle}\n\n• ${creditReasons.join("\n• ")}\n\n${c.confirmOverride}`);
      if (!ok) return;
      override = true;
    }

    setIsSubmitting(true);
    try {
      const result = saleId
        ? await updateSaleAction(saleId, values)
        : await recordSaleAction(values, { override });
      toast.success(saleId ? dict.common.saveChanges : dict.sales.saleRecorded);
      router.push(`/sales/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.date}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().slice(0, 10)
                        : field.value
                    }
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contacts.dueDate}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().slice(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.sales.customer}</FormLabel>
                <Select items={customerItems} value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.sales.selectCustomer} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salesmanId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contacts.salesman}</FormLabel>
                <Select
                  items={salesmanItems}
                  value={field.value ? field.value : SALESMAN_NONE}
                  onValueChange={(value) => field.onChange(value === SALESMAN_NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.contacts.noSalesman} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={SALESMAN_NONE}>{dict.contacts.noSalesman}</SelectItem>
                    {salesmen.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.purchases.paymentAccount}</FormLabel>
                <Select items={accountItems} value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.journal.selectAccount} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.reference}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.common.optional} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isCreditSale && credit && (
          <div
            className={
              hasCreditWarning
                ? "rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/30"
                : "rounded-md border bg-muted/30 p-3 text-sm"
            }
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{c.currentReceivable}</span>
              <span className="tabular-nums font-medium">{formatIDR(credit.receivable)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{c.creditLimit}</span>
              <span className="tabular-nums font-medium">
                {credit.creditLimit > 0 ? formatIDR(credit.creditLimit) : c.noLimit}
              </span>
            </div>
            {credit.creditLimit > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{c.availableAfterSale}</span>
                <span className="tabular-nums font-medium">
                  {formatIDR(credit.creditLimit - credit.receivable - total)}
                </span>
              </div>
            )}
            {hasCreditWarning && (
              <div className="mt-2 flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">{c.warningTitle}</p>
                  <ul className="list-inside list-disc">
                    {creditReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-72">{dict.purchases.product}</TableHead>
              <TableHead className="w-32 text-right">{dict.common.quantity}</TableHead>
              <TableHead className="w-40 text-right">{dict.sales.unitPrice}</TableHead>
              <TableHead className="w-40 text-right">{dict.purchases.lineTotal}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => {
              const qty = Number(lines[index]?.quantity) || 0;
              const price = Number(lines[index]?.unitPrice) || 0;
              const selectedProduct = productById[lines[index]?.productId ?? ""];
              const overStock = selectedProduct ? qty > selectedProduct.quantityOnHand : false;
              return (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`lines.${index}.productId`}
                      render={({ field: f }) => (
                        <Select
                          items={productItems}
                          value={f.value}
                          onValueChange={(value) => f.onChange(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={dict.purchases.selectProduct} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.label} ({p.quantityOnHand} {dict.sales.onHand})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {overStock && (
                      <p className="mt-1 text-xs text-destructive">
                        {dict.sales.onlyInStock.replace("{qty}", String(selectedProduct.quantityOnHand))}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`lines.${index}.quantity`}
                      render={({ field: f }) => (
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="text-right"
                          {...f}
                          onChange={(e) => f.onChange(e.target.valueAsNumber || 0)}
                        />
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`lines.${index}.unitPrice`}
                      render={({ field: f }) => (
                        <CurrencyInput value={f.value} onValueChange={(v) => f.onChange(v ?? 0)} />
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(qty * price)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
        >
          {dict.common.addLine}
        </Button>

        <div className="flex justify-end rounded-md border p-4 text-sm font-medium">
          {dict.common.total}: {formatIDR(total)}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? dict.common.saving
              : saleId
                ? dict.common.saveChanges
                : dict.sales.recordSale}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/sales")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
