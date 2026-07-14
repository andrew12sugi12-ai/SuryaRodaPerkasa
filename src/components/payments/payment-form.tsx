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
}: {
  customers: Option[];
  suppliers: Option[];
  accounts: Option[];
  defaultType?: "CUSTOMER_RECEIPT" | "SUPPLIER_PAYMENT";
  defaultCustomerId?: string;
  defaultSupplierId?: string;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date(),
      type: defaultType ?? "CUSTOMER_RECEIPT",
      customerId: defaultCustomerId ?? "",
      supplierId: defaultSupplierId ?? "",
      accountId: "",
      amount: 0,
      reference: "",
      memo: "",
    },
  });

  const type = form.watch("type");
  const amount = form.watch("amount");

  const customerItems = Object.fromEntries(customers.map((c) => [c.id, c.label]));
  const supplierItems = Object.fromEntries(suppliers.map((s) => [s.id, s.label]));
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.label]));
  const typeItems = {
    CUSTOMER_RECEIPT: dict.payments.receiveFromCustomer,
    SUPPLIER_PAYMENT: dict.payments.paySupplier,
  };

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

        <div className="grid gap-4 sm:grid-cols-2">
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
                  <Input
                    type="number"
                    min="0"
                    className="text-right"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">{formatIDR(amount || 0)}</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
              <FormMessage />
            </FormItem>
          )}
        />

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
