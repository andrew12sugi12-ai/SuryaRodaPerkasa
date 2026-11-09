"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";

import { productSchema, type ProductInput } from "@/lib/validation/product";
import { createProductAction, updateProductAction } from "@/server/actions/products.actions";
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

export function ProductForm({
  productId,
  defaultValues,
}: {
  productId?: string;
  defaultValues?: ProductInput;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues ?? {
      sku: "",
      name: "",
      description: "",
      unitPrice: 0,
      isActive: true,
      openingQuantity: 0,
      openingUnitCost: 0,
    },
  });

  async function onSubmit(values: ProductInput) {
    setIsSubmitting(true);
    try {
      if (productId) {
        await updateProductAction(productId, values);
        toast.success(dict.products.productUpdated);
      } else {
        await createProductAction(values);
        toast.success(dict.products.productCreated);
      }
      router.push("/products");
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
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.products.sku}</FormLabel>
              <FormControl>
                <Input placeholder="BIKE-001" {...field} />
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
                <Input placeholder="Mountain Bike 26&quot;" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dict.common.description}</FormLabel>
              <FormControl>
                <Input placeholder={dict.common.optional} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!productId && (
          <div className="space-y-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">{dict.products.openingStock}</p>
              <p className="text-xs text-muted-foreground">
                {dict.products.openingStockHelp}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="openingQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.products.quantityOnHand}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
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
                name="openingUnitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{dict.products.costPerUnit}</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onValueChange={(v) => field.onChange(v ?? 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
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
            {isSubmitting ? dict.common.saving : productId ? dict.common.saveChanges : dict.products.createProduct}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/products")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
