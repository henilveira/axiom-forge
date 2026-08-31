import type { ComponentProps } from "react";

import { cn } from "./cn";

// ponytail: @radix-ui/react-label is not installed. Its only behavior beyond a
// plain <label> is Radix's pointer-cancel-on-select-text handling, which this
// pure visual layer doesn't need yet. Add the Radix primitive if a form later
// depends on it.
export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
