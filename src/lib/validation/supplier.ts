import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  isActive: z.boolean(),
  openingBalance: z.number().min(0, "Opening balance must be zero or more").optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
