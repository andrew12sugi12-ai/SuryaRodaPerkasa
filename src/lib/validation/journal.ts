import { z } from "zod";

export const journalLineSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    debit: z.number().min(0),
    credit: z.number().min(0),
    description: z.string().optional(),
  })
  .refine((line) => (line.debit > 0) !== (line.credit > 0), {
    message: "Enter either a debit or a credit, not both",
    path: ["debit"],
  });

export const journalEntrySchema = z
  .object({
    date: z.date(),
    memo: z.string().optional(),
    reference: z.string().optional(),
    lines: z.array(journalLineSchema).min(2, "At least two lines are required"),
  })
  .refine(
    (entry) => {
      const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: "Total debits must equal total credits", path: ["lines"] }
  );

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type JournalLineInput = z.infer<typeof journalLineSchema>;
