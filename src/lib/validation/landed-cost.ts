import { z } from "zod";

export const landedCostSchema = z.object({
  purchaseId: z.string().min(1),
  selectedLineIds: z.array(z.string().min(1)).min(1, "Select at least one product"),
  totalCost: z.number().positive("Enter a cost greater than zero"),
  offsetAccountId: z.string().min(1, "Choose where the cost is owed/paid"),
  date: z.date(),
  reference: z.string().optional(),
  memo: z.string().optional(),
});

export type LandedCostFormInput = z.infer<typeof landedCostSchema>;
