import { z } from "zod";

export const salesmanSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  phone: z.string().optional(),
  monthlyTarget: z.number().min(0, "Target must be zero or more").optional(),
  isActive: z.boolean(),
});

export type SalesmanInput = z.infer<typeof salesmanSchema>;
