"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n-provider";
import { Trash2 } from "lucide-react";

import { journalEntrySchema, type JournalEntryInput } from "@/lib/validation/journal";
import { createJournalEntryAction } from "@/server/actions/journal.actions";
import { updateJournalEntryAction } from "@/server/actions/admin.actions";
import { formatIDR } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AccountOption = { id: string; code: string; name: string };

export function JournalEntryForm({
  accounts,
  entryId,
  defaultValues,
}: {
  accounts: AccountOption[];
  entryId?: string;
  defaultValues?: JournalEntryInput;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JournalEntryInput>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: defaultValues ?? {
      date: new Date(),
      memo: "",
      reference: "",
      lines: [
        { accountId: "", debit: 0, credit: 0, description: "" },
        { accountId: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const accountItems = Object.fromEntries(
    accounts.map((account) => [account.id, `${account.code} — ${account.name}`])
  );

  const lines = form.watch("lines");
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  async function onSubmit(values: JournalEntryInput) {
    setIsSubmitting(true);
    try {
      const result = entryId
        ? await updateJournalEntryAction(entryId, values)
        : await createJournalEntryAction(values);
      toast.success(entryId ? dict.common.saveChanges : dict.journal.entryCreated);
      router.push(`/journal-entries/${result.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.somethingWentWrong);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.date}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().slice(0, 10)
                        : field.value
                    }
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.reference}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.common.optional} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dict.common.memo}</FormLabel>
                <FormControl>
                  <Input placeholder={dict.common.optional} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">{dict.common.account}</TableHead>
              <TableHead>{dict.common.description}</TableHead>
              <TableHead className="w-40 text-right">{dict.common.debit}</TableHead>
              <TableHead className="w-40 text-right">{dict.common.credit}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id}>
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`lines.${index}.accountId`}
                    render={({ field: f }) => (
                      <Select
                        items={accountItems}
                        value={f.value}
                        onValueChange={(value) => f.onChange(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={dict.journal.selectAccount} />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} — {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field: f }) => <Input placeholder={dict.common.optional} {...f} />}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`lines.${index}.debit`}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        className="text-right"
                        {...f}
                        onChange={(e) => {
                          f.onChange(e.target.valueAsNumber || 0);
                          if (e.target.valueAsNumber > 0) {
                            form.setValue(`lines.${index}.credit`, 0);
                          }
                        }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`lines.${index}.credit`}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        className="text-right"
                        {...f}
                        onChange={(e) => {
                          f.onChange(e.target.valueAsNumber || 0);
                          if (e.target.valueAsNumber > 0) {
                            form.setValue(`lines.${index}.debit`, 0);
                          }
                        }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={fields.length <= 2}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ accountId: "", debit: 0, credit: 0, description: "" })}
        >
          {dict.common.addLine}
        </Button>

        <div className="flex items-center justify-end gap-6 rounded-md border p-4 text-sm">
          <div>
            {dict.journal.totalDebit}: <span className="font-medium">{formatIDR(totalDebit)}</span>
          </div>
          <div>
            {dict.journal.totalCredit}: <span className="font-medium">{formatIDR(totalCredit)}</span>
          </div>
          <div className={isBalanced ? "text-green-600" : "text-destructive"}>
            {isBalanced ? dict.journal.balanced : dict.journal.notBalanced}
          </div>
        </div>

        {form.formState.errors.lines?.root?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.lines.root.message}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || !isBalanced}>
            {isSubmitting
              ? dict.common.saving
              : entryId
                ? dict.common.saveChanges
                : dict.journal.createEntry}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/journal-entries")}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
