import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(40),
  name: z.string().min(1, "Name is required").max(160),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Price must be zero or more").optional(),
  isActive: z.boolean(),
  openingQuantity: z.number().min(0, "Quantity must be zero or more").optional(),
  openingUnitCost: z.number().min(0, "Unit cost must be zero or more").optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
