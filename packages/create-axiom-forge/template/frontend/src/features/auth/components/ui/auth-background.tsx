import type { ReactElement, ReactNode } from "react";

import { cn } from "@shared";

import { FloatingShapes } from "./floating-shapes";

export function AuthBackground({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>): ReactElement {
  return (
    <main className={cn("relative min-h-screen overflow-hidden", className)}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a1f10 0%, #0f3a1c 22%, #15803d 55%, #4ade80 78%, #bef264 92%, hsl(var(--background)) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center_top,_hsl(var(--accent)/0.22)_0%,_transparent_60%)]"
        aria-hidden="true"
      />
      <FloatingShapes />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
