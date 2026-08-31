import type { ButtonHTMLAttributes } from "react";

import { cn } from "./cn";

// ponytail: omitted variants (accent, subtle, destructive, destructiveOutline,
// secondary, ghost, link) and `asChild` (needs @radix-ui/react-slot, not
// installed) — the auth screens only use default/brand/outline/outlineOnDark.
// Add the rest when a screen needs them.
export type ButtonVariant = "default" | "brand" | "outline" | "outlineOnDark";
export type ButtonSize = "default" | "sm" | "lg" | "xl" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-tight ring-offset-background transition-[transform,background-color,box-shadow,border-color,color] duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

// Subtle shine sweep used on solid variants (mirrors vite's shineEffect).
const SHINE_CLASSES =
  "relative overflow-hidden before:absolute before:inset-0 before:bg-primary-foreground/10 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-500 before:ease-out before:skew-x-12";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: `bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-elev ${SHINE_CLASSES}`,
  brand: `bg-brand text-brand-foreground shadow-soft hover:shadow-elev ${SHINE_CLASSES}`,
  outline: "border border-input bg-background hover:bg-accent/15 hover:text-foreground hover:border-primary/40",
  // Uses `foreground` (not `primary-foreground`): this variant means "on a
  // dark surface", and `--foreground` is what actually flips light/dark
  // depending on the nearest `.dark` scope. `--primary-foreground` instead
  // tracks contrast-against-`--primary`, which is deliberately dark-on-green
  // in dark mode — wrong meaning here, and the root cause of the
  // invisible-text bug.
  outlineOnDark:
    "border border-foreground/30 bg-transparent text-foreground hover:bg-foreground/10 hover:border-foreground/50 focus-visible:ring-foreground/30",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3 text-[13px]",
  lg: "h-11 rounded-md px-8",
  xl: "h-12 rounded-md px-10 text-base",
  icon: "h-10 w-10",
};

export function Button({ className, variant = "default", size = "default", ...props }: Readonly<ButtonProps>) {
  return (
    <button
      className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)}
      {...props}
    />
  );
}
