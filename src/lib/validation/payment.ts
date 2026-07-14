import { z } from "zod";

export const PAYMENT_TYPES = ["CUSTOMER_RECEIPT", "SUPPLIER_PAYMENT"] as const;

export const paymentSchema = z
  .object({
    date: z.date(),
    type: z.enum(PAYMENT_TYPES),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
    accountId: z.string().min(1, "Account is required"),
    amount: z.number().positive("Amount must be greater than zero"),
    reference: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine(
    (p) => (p.type === "CUSTOMER_RECEIPT" ? !!p.customerId : !!p.supplierId),
    { message: "Select who this payment is for", path: ["customerId"] }
  );

export type PaymentInput = z.infer<typeof paymentSchema>;
