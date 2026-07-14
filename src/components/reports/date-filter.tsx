"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateFilter({
  paramName,
  label,
  defaultValue,
}: {
  paramName: string;
  label: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? defaultValue;

  function onChange(newValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, newValue);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={paramName} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <Input
        id={paramName}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-40"
      />
    </div>
  );
}
