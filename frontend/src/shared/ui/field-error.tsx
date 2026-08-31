import type { ComponentProps } from "react";

import { cn } from "./cn";

// ponytail: lucide-react is not installed; a static inline alert-circle glyph
// covers the one icon this primitive needs.
export function FieldError({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("flex items-center gap-1 text-sm text-destructive", className)} {...props}>
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {children}
    </p>
  );
}
