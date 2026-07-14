"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import {
  ACCOUNT_TYPES,
  NORMAL_BALANCES,
  ACCOUNT_EXPENSE_CATEGORIES,
  accountSchema,
  type AccountInput,
} from "@/lib/validation/account";

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  COGS: "Harga Pokok Penjualan (COGS)",
  OPERATIONAL: "B. Operasional",
  FIXED: "B. Tetap",
  SALES: "B. Sales",
  OTHER: "B. Lain-Lain",
};
import { createAccountAction, updateAccountAction } from "@/server/actions/accounts.actions";
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

export function AccountForm({
  accountId,
  defaultValues,
}: {
  accountId?: string;
  defaultValues?: AccountInput;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: defaultValues ?? {
      code: "",
      name: "",
      type: "ASSET",
      normalBalance: "DEBIT",
      isLongTerm: false,
      isActive: true,
    },
  });

  const accountType = form.watch("type");
  const showLongTerm = accountType === "ASSET" || accountType === "LIABILITY";

  async function onSubmit(values: AccountInput) {
    setIsSubmitting(true);
    try {
      if (accountId) {
        await updateAccountAction(accountId, values);
        toast.success(dict.accounts.accountUpdated);
      } else {
        await createAccountAction(values);
        toast.success(dict.accounts.accountCreated);
      }
      router.push("/accounts");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.code}</FormLabel>
              <FormControl>
                <Input placeholder="1000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.name}</FormLabel>
              <FormControl>
                <Input placeholder="Cash" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.type}</FormLabel>
              <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.accounts.selectType} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.watch("type") === "EXPENSE" && (
          <FormField
            control={form.control}
            name="expenseCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.accounts.expenseCategory}</FormLabel>
                <Select
                  items={EXPENSE_CATEGORY_LABELS}
                  value={field.value ?? "OPERATIONAL"}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={dict.accounts.selectCategory} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {EXPENSE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {showLongTerm && (
          <FormField
            control={form.control}
            name="isLongTerm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.accounts.classification}</FormLabel>
                <Select
                  items={{
                    current: dict.accounts.current,
                    longTerm: dict.accounts.longTerm,
                  }}
                  value={field.value ? "longTerm" : "current"}
                  onValueChange={(value) => field.onChange(value === "longTerm")}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="current">{dict.accounts.current}</SelectItem>
                    <SelectItem value="longTerm">{dict.accounts.longTerm}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="normalBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.accounts.normalBalance}</FormLabel>
              <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.accounts.selectNormalBalance} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NORMAL_BALANCES.map((nb) => (
                    <SelectItem key={nb} value={nb}>
                      {nb}
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
          name="isActive"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.status}</FormLabel>
              <Select
                items={{ active: dict.common.active, inactive: dict.common.inactive }}
                value={field.value ? "active" : "inactive"}
                onValueChange={(value) => field.onChange(value === "active")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={dict.accounts.selectStatus} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">{dict.common.active}</SelectItem>
                  <SelectItem value="inactive">{dict.common.inactive}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? dict.common.saving : accountId ? dict.common.saveChanges : dict.accounts.createAccount}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/accounts")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
