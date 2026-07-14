"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { Trash2 } from "lucide-react";

import { saleSchema, type SaleInput } from "@/lib/validation/sale";
import { recordSaleAction } from "@/server/actions/sales.actions";
import { updateSaleAction } from "@/server/actions/admin.actions";
import { formatIDR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function SaleForm({
  customers,
  accounts,
  products,
  saleId,
  defaultValues,
}: {
  customers: Option[];
  accounts: Option[];
  products: ProductOption[];
  saleId?: string;
  defaultValues?: SaleInput;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SaleInput>({
    resolver: zodResolver(saleSchema),
    defaultValues: defaultValues ?? {
      date: new Date(),
      customerId: "",
      paymentAccountId: "",
      reference: "",
      lines: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = form.watch("lines");
  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const customerItems = Object.fromEntries(customers.map((c) => [c.id, c.label]));
  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.label]));
  const productItems = Object.fromEntries(products.map((p) => [p.id, p.label]));
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  async function onSubmit(values: SaleInput) {
    setIsSubmitting(true);
    try {
      const result = saleId
        ? await updateSaleAction(saleId, values)
        : await recordSaleAction(values);
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
        <div className="grid gap-4 sm:grid-cols-4">
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
