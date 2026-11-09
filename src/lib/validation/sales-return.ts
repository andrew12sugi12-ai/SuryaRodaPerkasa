import { z } from "zod";

export const salesReturnSchema = z.object({
  saleId: z.string().min(1),
  date: z.date(),
  reason: z.string().optional(),
  number: z.string().optional(),
  restock: z.boolean(),
  lines: z
    .array(
      z.object({
        saleLineId: z.string().min(1),
        quantity: z.number().min(0),
      })
    )
    .min(1),
});

export type SalesReturnFormInput = z.infer<typeof salesReturnSchema>;
