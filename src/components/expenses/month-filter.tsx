"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export function MonthFilter({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("month") ?? defaultValue;

  return (
    <Input
      type="month"
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("month", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="w-44"
    />
  );
}
