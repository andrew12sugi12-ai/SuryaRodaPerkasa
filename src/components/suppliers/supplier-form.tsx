"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import { supplierSchema, type SupplierInput } from "@/lib/validation/supplier";
import { createSupplierAction, updateSupplierAction } from "@/server/actions/suppliers.actions";
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

export function SupplierForm({
  supplierId,
  defaultValues,
}: {
  supplierId?: string;
  defaultValues?: SupplierInput;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultValues ?? {
      name: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      isActive: true,
      openingBalance: 0,
    },
  });

  async function onSubmit(values: SupplierInput) {
    setIsSubmitting(true);
    try {
      if (supplierId) {
        await updateSupplierAction(supplierId, values);
        toast.success(dict.contacts.supplierUpdated);
      } else {
        await createSupplierAction(values);
        toast.success(dict.contacts.supplierCreated);
      }
      router.push("/suppliers");
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
                <Input placeholder={dict.contacts.supplierName} {...field} />
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
        {!supplierId && (
          <FormField
            control={form.control}
            name="openingBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.contacts.openingPayable}</FormLabel>
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
            {isSubmitting ? dict.common.saving : supplierId ? dict.common.saveChanges : dict.contacts.createSupplier}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/suppliers")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
