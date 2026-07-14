"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import {
  EXPENSE_CATEGORIES,
  expenseSchema,
  type ExpenseInput,
} from "@/lib/validation/expense";
import { recordExpenseAction } from "@/server/actions/expenses.actions";
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

export function ExpenseForm({ accounts }: { accounts: Option[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      description: "",
      amount: 0,
      category: "OPERATIONAL",
      paidFromAccountId: "",
    },
  });

  const accountItems = Object.fromEntries(accounts.map((a) => [a.id, a.label]));
  const categoryItems = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, dict.expenses.categories[c]])
  );

  async function onSubmit(values: ExpenseInput) {
    setIsSubmitting(true);
    try {
      await recordExpenseAction(values);
      toast.success(dict.expenses.expenseRecorded);
      form.reset({
        date: values.date,
        description: "",
        amount: 0,
        category: values.category,
        paidFromAccountId: values.paidFromAccountId,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid items-end gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
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
          name="description"
          render={({ field }) => (
            <FormItem className="lg:col-span-2">
              <FormLabel>{dict.common.description}</FormLabel>
              <FormControl>
                <Input placeholder={dict.expenses.descriptionPlaceholder} {...field} />
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.expenses.category}</FormLabel>
              <Select items={categoryItems} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.expenses.category} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {dict.expenses.categories[c]}
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
          name="paidFromAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.expenses.paidFrom}</FormLabel>
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
        <Button type="submit" disabled={isSubmitting} className="lg:col-span-6 sm:col-span-2">
          {isSubmitting ? dict.common.saving : dict.expenses.addExpense}
        </Button>
      </form>
    </Form>
  );
}
