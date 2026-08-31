import type { ReactElement } from "react";

export function LandingBrandMark(): ReactElement {
  return <span className="inline-flex items-center gap-2" aria-label="Starter App"><svg aria-hidden="true" viewBox="0 0 32 32" className="size-8"><rect width="32" height="32" rx="10" fill="currentColor" /><path d="M10 22V10h6.5a5 5 0 0 1 0 10H14v2h-4Zm4-6h2.2a1.5 1.5 0 0 0 0-3H14v3Z" fill="var(--background)" /></svg><span className="text-lg font-bold">starter<span className="text-accent">app</span></span></span>;
}
