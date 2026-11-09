import { FileSpreadsheet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Download link for an Excel report. Renders a plain <a> (the href is an API
 * route that streams an .xlsx attachment) so no client JS is needed.
 */
export function ExcelButton({
  href,
  label = "Unduh Excel",
  variant = "outline",
  className,
}: {
  href: string;
  label?: string;
  variant?: "outline" | "default" | "ghost";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant }), "no-print", className)}
    >
      <FileSpreadsheet className="mr-2 size-4" />
      {label}
    </a>
  );
}
