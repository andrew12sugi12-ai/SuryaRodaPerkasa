import { z } from "zod";

export const purchaseLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitCost: z.number().min(0, "Unit cost must be zero or more"),
});

export const purchaseSchema = z.object({
  date: z.date(),
  // Jatuh tempo — when this purchase's payment is due. Optional (cash purchases).
  dueDate: z.date().optional(),
  supplierId: z.string().min(1, "Supplier is required"),
  paymentAccountId: z.string().min(1, "Payment account is required"),
  reference: z.string().optional(),
  lines: z.array(purchaseLineSchema).min(1, "At least one line is required"),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;
