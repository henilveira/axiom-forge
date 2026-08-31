import type { ReactElement } from "react";

import type { LandingHeadingProps, LandingSectionProps } from "./landing.props";

export function LandingSection({ children, id, className = "" }: LandingSectionProps): ReactElement {
  return <section id={id} className={`mx-auto w-full max-w-6xl px-6 py-20 sm:py-28 ${className}`}>{children}</section>;
}

export function LandingHeading({ eyebrow, title, subtitle }: LandingHeadingProps): ReactElement {
  return <div className="mx-auto mb-12 max-w-2xl text-center"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</p><h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h2><p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p></div>;
}
