"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";

export function PrintButton() {
  const { dict } = useI18n();
  return (
    <Button type="button" variant="outline" className="no-print" onClick={() => window.print()}>
      <Printer className="mr-2 size-4" />
      {dict.reports.downloadPdf}
    </Button>
  );
}
