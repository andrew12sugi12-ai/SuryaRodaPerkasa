import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().min(0, "Unit price must be zero or more"),
});

export const saleSchema = z.object({
  date: z.date(),
  // Jatuh tempo — when this sale's payment is due. Optional (cash sales).
  dueDate: z.date().optional(),
  customerId: z.string().min(1, "Customer is required"),
  salesmanId: z.string().optional().or(z.literal("")),
  paymentAccountId: z.string().min(1, "Payment account is required"),
  reference: z.string().optional(),
  lines: z.array(saleLineSchema).min(1, "At least one line is required"),
});

export type SaleInput = z.infer<typeof saleSchema>;
export type SaleLineInput = z.infer<typeof saleLineSchema>;
