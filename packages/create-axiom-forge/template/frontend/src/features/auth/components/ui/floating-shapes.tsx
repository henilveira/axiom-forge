import type { ReactElement } from "react";

export function FloatingShapes(): ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-accent/8 sm:-left-20 sm:-top-20 sm:h-80 sm:w-80" />
      <div className="absolute right-0 top-20 hidden h-32 w-32 rotate-45 rounded-3xl bg-brand/6 sm:block sm:h-40 sm:w-40" />
      <div className="absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-accent/5 sm:-bottom-16 sm:left-1/3 sm:h-64 sm:w-64" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
