import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  isActive: z.boolean(),
  openingBalance: z.number().min(0, "Opening balance must be zero or more").optional(),
  // Credit control (B2B tempo terms)
  creditLimit: z.number().min(0, "Credit limit must be zero or more").optional(),
  termDays: z.number().int().min(0, "Term days must be zero or more").max(365).optional(),
  cashOnly: z.boolean().optional(),
  salesmanId: z.string().optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
