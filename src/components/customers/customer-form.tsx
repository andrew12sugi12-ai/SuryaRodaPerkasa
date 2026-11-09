"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import { customerSchema, type CustomerInput } from "@/lib/validation/customer";
import { createCustomerAction, updateCustomerAction } from "@/server/actions/customers.actions";
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

export function CustomerForm({
  customerId,
  defaultValues,
  salesmen = [],
}: {
  customerId?: string;
  defaultValues?: CustomerInput;
  salesmen?: Option[];
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? {
      name: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      isActive: true,
      openingBalance: 0,
      creditLimit: 0,
      termDays: 0,
      cashOnly: false,
      salesmanId: "",
    },
  });

  const NONE = "__none__";
  const salesmanItems = {
    [NONE]: dict.contacts.noSalesman,
    ...Object.fromEntries(salesmen.map((s) => [s.id, s.label])),
  };

  async function onSubmit(values: CustomerInput) {
    setIsSubmitting(true);
    try {
      if (customerId) {
        await updateCustomerAction(customerId, values);
        toast.success(dict.contacts.customerUpdated);
      } else {
        await createCustomerAction(values);
        toast.success(dict.contacts.customerCreated);
      }
      router.push("/customers");
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.name}</FormLabel>
              <FormControl>
                <Input placeholder={dict.contacts.customerName} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.contactName}</FormLabel>
              <FormControl>
                <Input placeholder={dict.common.optional} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.phone}</FormLabel>
              <FormControl>
                <Input placeholder={dict.common.optional} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.email}</FormLabel>
              <FormControl>
                <Input placeholder={dict.common.optional} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.address}</FormLabel>
              <FormControl>
                <Input placeholder={dict.common.optional} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="rounded-md border p-4 space-y-4">
          <p className="text-sm font-medium">{dict.contacts.creditControl}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="creditLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.contacts.creditLimit}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{dict.contacts.creditLimitHelp}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="termDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.contacts.termDays}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      value={field.value ?? 0}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{dict.contacts.termDaysHelp}</p>
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
                    value={field.value ? field.value : NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={dict.contacts.noSalesman} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>{dict.contacts.noSalesman}</SelectItem>
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
              name="cashOnly"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dict.contacts.paymentTerms}</FormLabel>
                  <Select
                    items={{ credit: dict.contacts.allowCredit, cash: dict.contacts.cashOnly }}
                    value={field.value ? "cash" : "credit"}
                    onValueChange={(value) => field.onChange(value === "cash")}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="credit">{dict.contacts.allowCredit}</SelectItem>
                      <SelectItem value="cash">{dict.contacts.cashOnly}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        {!customerId && (
          <FormField
            control={form.control}
            name="openingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contacts.openingReceivable}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">{dict.contacts.openingBalanceHelp}</p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
            {isSubmitting ? dict.common.saving : customerId ? dict.common.saveChanges : dict.contacts.createCustomer}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/customers")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
