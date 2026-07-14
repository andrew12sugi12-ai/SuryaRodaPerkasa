import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().min(0, "Unit price must be zero or more"),
});

export const saleSchema = z.object({
  date: z.date(),
  customerId: z.string().min(1, "Customer is required"),
  paymentAccountId: z.string().min(1, "Payment account is required"),
  reference: z.string().optional(),
  lines: z.array(saleLineSchema).min(1, "At least one line is required"),
});

export type SaleInput = z.infer<typeof saleSchema>;
export type SaleLineInput = z.infer<typeof saleLineSchema>;
