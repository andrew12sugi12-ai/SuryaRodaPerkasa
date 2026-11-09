"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import { paymentSchema, type PaymentInput } from "@/lib/validation/payment";
import { recordPaymentAction } from "@/server/actions/payments.actions";
import { formatIDR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; label: string };

export function PaymentForm({
  customers,
  suppliers,
  accounts,
  defaultType,
  defaultCustomerId,
  defaultSupplierId,
  receivableByCustomer,
}: {
  customers: Option[];
  suppliers: Option[];
  accounts: Option[];
  defaultType?: "CUSTOMER_RECEIPT" | "SUPPLIER_PAYMENT";
  defaultCustomerId?: string;
  defaultSupplierId?: string;
  /** customerId -> current outstanding receivable, for the overpayment warning. */
  receivableByCustomer?: Record<string, number>;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date(),
      type: defaultType ?? "CUSTOMER_RECEIPT",
      method: "TRANSFER",
      customerId: defaultCustomerId ?? "",
      supplierId: defaultSupplierId ?? "",
      accountId: "",
      amount: 0,
      reference: "",
      memo: "",
    },
  });

  const type = form.watch("type");
  const method = form.watch("method");
  const isGiro = method === "GIRO" || method === "CEK";
  const amount = form.watch("amount");
  const discount = form.watch("discount");
  const canDiscount = type === "CUSTOMER_RECEIPT" && !isGiro;
  const cashAmount = form.watch("cashAmount");
  // FX difference preview: settle amount vs. actual cash moved.
  const fxDiff =
    cashAmount && cashAmount > 0 && amount > 0
      ? type === "SUPPLIER_PAYMENT"
        ? amount - cashAmount
        : cashAmount - amount
      : 0;

  const customerId = form.watch("customerId");
  // Overpayment detection: a customer receipt larger than what they owe creates
  // an advance (Uang Muka Pelanggan). Warn so it is never accidental.
  const outstanding =
    type === "CUSTOMER_RECEIPT" && customerId ? receivableByCustomer?.[customerId] : undefined;
  const overpayExcess =
    outstanding !== undefined && (amount || 0) > outstanding ? (amount || 0) - outstanding : 0;

  const customerItems = Object.fromEntries(customers.map((c) => [c.id, c.label]));
  const supplierItems = Object.fromEntries(suppliers.map((s) => [s.id, s.label]));
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.label]));
  const typeItems = {
    CUSTOMER_RECEIPT: dict.payments.receiveFromCustomer,
    SUPPLIER_PAYMENT: dict.payments.paySupplier,
  };
  const methodItems = dict.payments.methodLabels;

  async function onSubmit(values: PaymentInput) {
    setIsSubmitting(true);
    try {
      await recordPaymentAction(values);
      toast.success(dict.payments.paymentRecorded);
      router.push("/payments");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-xl space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.payments.paymentType}</FormLabel>
              <Select items={typeItems} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CUSTOMER_RECEIPT">{dict.payments.receiveFromCustomer}</SelectItem>
                  <SelectItem value="SUPPLIER_PAYMENT">{dict.payments.paySupplier}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.payments.method}</FormLabel>
              <Select items={methodItems} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CASH">{methodItems.CASH}</SelectItem>
                  <SelectItem value="TRANSFER">{methodItems.TRANSFER}</SelectItem>
                  <SelectItem value="GIRO">{methodItems.GIRO}</SelectItem>
                  <SelectItem value="CEK">{methodItems.CEK}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isGiro && (
          <div className="grid gap-4 rounded-md border border-dashed p-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="instrumentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.payments.instrumentNumber}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instrumentBank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.payments.instrumentBank}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
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
                  <FormLabel>{dict.payments.giroDueDate}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : ""}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {type === "CUSTOMER_RECEIPT" ? (
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.sales.customer}</FormLabel>
                <Select
                  items={customerItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
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
        ) : (
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.purchases.supplier}</FormLabel>
                <Select
                  items={supplierItems}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.purchases.selectSupplier} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((s) => (
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
        )}

        <div className="grid grid-cols-2 items-start gap-4">
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.amount}</FormLabel>
                <FormControl>
                  <CurrencyInput value={field.value} onValueChange={(v) => field.onChange(v ?? 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {overpayExcess > 0 && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium text-warning">Melebihi sisa piutang</p>
            <p className="text-muted-foreground">
              Sisa piutang {formatIDR(outstanding ?? 0)}. Kelebihan{" "}
              <span className="font-medium text-foreground">{formatIDR(overpayExcess)}</span> akan
              dicatat sebagai Uang Muka Pelanggan (titipan) dan otomatis dipakai untuk transaksi
              berikutnya.
            </p>
          </div>
        )}

        {canDiscount && (
          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.payments.discount}</FormLabel>
                <FormControl>
                  <CurrencyInput
                    className="max-w-xs"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">{dict.payments.discountHint}</p>
                {(discount ?? 0) > 0 && (
                  <p className="text-xs font-medium">
                    {dict.payments.netReceived}: {formatIDR(Math.max(0, (amount || 0) - (discount || 0)))}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {type === "CUSTOMER_RECEIPT" ? dict.payments.depositInto : dict.payments.payFrom}
              </FormLabel>
              <Select items={accountItems} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kas/Bank" />
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
              {isGiro && type === "CUSTOMER_RECEIPT" && (
                <p className="text-xs text-muted-foreground">{dict.payments.depositBankHint}</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "SUPPLIER_PAYMENT" && !isGiro && (
          <FormField
            control={form.control}
            name="cashAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.payments.cashAmount}</FormLabel>
                <FormControl>
                  <CurrencyInput
                    className="max-w-xs"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">{dict.payments.cashAmountHelp}</p>
                {fxDiff !== 0 && (
                  <p className={`text-xs font-medium ${fxDiff > 0 ? "text-green-600" : "text-red-600"}`}>
                    {fxDiff > 0 ? dict.payments.fxGain : dict.payments.fxLoss}: {formatIDR(Math.abs(fxDiff))}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.reference}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.payments.referencePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.memo}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.common.optional} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? dict.common.saving : dict.payments.recordPayment}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/payments")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
