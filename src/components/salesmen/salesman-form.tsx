"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import { salesmanSchema, type SalesmanInput } from "@/lib/validation/salesman";
import {
  createSalesmanAction,
  updateSalesmanAction,
} from "@/server/actions/salesmen.actions";
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

export function SalesmanForm({
  salesmanId,
  defaultValues,
}: {
  salesmanId?: string;
  defaultValues?: SalesmanInput;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.salesmen;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SalesmanInput>({
    resolver: zodResolver(salesmanSchema),
    defaultValues: defaultValues ?? {
      name: "",
      phone: "",
      monthlyTarget: 0,
      isActive: true,
    },
  });

  async function onSubmit(values: SalesmanInput) {
    setIsSubmitting(true);
    try {
      if (salesmanId) {
        await updateSalesmanAction(salesmanId, values);
        toast.success(t.updated);
      } else {
        await createSalesmanAction(values);
        toast.success(t.created);
      }
      router.push("/salesmen");
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
                <Input placeholder={t.namePlaceholder} {...field} />
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
          name="monthlyTarget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.monthlyTarget}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{t.monthlyTargetHelp}</p>
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
                    <SelectValue />
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
            {isSubmitting ? dict.common.saving : salesmanId ? dict.common.saveChanges : t.create}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/salesmen")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
