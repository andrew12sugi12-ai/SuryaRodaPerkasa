import { z } from "zod";

export const PRODUCT_CATEGORIES = ["SPAREPART", "BICYCLE"] as const;

export const productComponentSchema = z.object({
  componentId: z.string().min(1, "Component is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
});

export const productSchema = z
  .object({
    sku: z.string().min(1, "SKU is required").max(40),
    name: z.string().min(1, "Name is required").max(160),
    description: z.string().optional(),
    category: z.enum(PRODUCT_CATEGORIES),
    unitPrice: z.number().min(0, "Price must be zero or more").optional(),
    isActive: z.boolean(),
    openingQuantity: z.number().min(0, "Quantity must be zero or more").optional(),
    openingUnitCost: z.number().min(0, "Unit cost must be zero or more").optional(),
    // Bill of materials. When present (non-empty) this product is an assembled
    // bike: it carries no stock of its own and its cost is the sum of its parts.
    components: z.array(productComponentSchema).optional(),
  })
  .refine(
    (p) => {
      const ids = (p.components ?? []).map((c) => c.componentId);
      return ids.length === new Set(ids).size;
    },
    { message: "A component is listed more than once", path: ["components"] }
  );

export type ProductInput = z.infer<typeof productSchema>;
