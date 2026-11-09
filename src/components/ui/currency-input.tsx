"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null | undefined;
  onValueChange: (value: number | undefined) => void;
};

// A text input that displays an integer-Rupiah value with thousands separators
// (Indonesian "1.000.000") while reporting a plain number to the caller.
export function CurrencyInput({ value, onValueChange, className, ...props }: Props) {
  const display =
    !value || Number.isNaN(value) ? "" : Number(value).toLocaleString("id-ID");

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      className={`text-right tabular-nums ${className ?? ""}`}
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onValueChange(digits === "" ? undefined : parseInt(digits, 10));
      }}
    />
  );
}
