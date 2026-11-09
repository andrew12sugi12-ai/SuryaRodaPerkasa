import { z } from "zod";

export const PAYMENT_TYPES = ["CUSTOMER_RECEIPT", "SUPPLIER_PAYMENT"] as const;
export const PAYMENT_METHODS = ["CASH", "TRANSFER", "GIRO", "CEK"] as const;

export const paymentSchema = z
  .object({
    date: z.date(),
    type: z.enum(PAYMENT_TYPES),
    method: z.enum(PAYMENT_METHODS),
    customerId: z.string().optional(),
    supplierId: z.string().optional(),
    accountId: z.string().min(1, "Account is required"),
    amount: z.number().positive("Amount must be greater than zero"),
    // Actual IDR through the cash/bank account (foreign-currency settlements).
    // Optional; when omitted it equals `amount` (ordinary IDR payment).
    cashAmount: z.number().positive("Cash amount must be greater than zero").optional(),
    // Early-payment discount (customer receipt). Reduces revenue via 4900.
    discount: z.number().min(0).optional(),
    // Giro/cek instrument detail (only for method GIRO/CEK).
    instrumentNumber: z.string().optional(),
    instrumentBank: z.string().optional(),
    dueDate: z.date().optional(),
    reference: z.string().optional(),
    memo: z.string().optional(),
  })
  .refine(
    (p) => (p.type === "CUSTOMER_RECEIPT" ? !!p.customerId : !!p.supplierId),
    { message: "Select who this payment is for", path: ["customerId"] }
  )
  .refine(
    (p) => (p.method === "GIRO" || p.method === "CEK" ? !!p.instrumentNumber : true),
    { message: "Giro/cek number is required", path: ["instrumentNumber"] }
  );

export type PaymentInput = z.infer<typeof paymentSchema>;
