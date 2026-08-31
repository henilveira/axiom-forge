import type { ReactElement } from "react";

import { LANDING_STEPS } from "@landing/constants";
import { LandingHeading, LandingSection } from "./landing-section";

export function TimelineSection(): ReactElement {
  return <LandingSection id="how-it-works" className="bg-white"><LandingHeading eyebrow="FLUXO SDD" title="Da intenção à entrega" subtitle="Uma sequência clara para reduzir ambiguidade e manter o produto derivado sob controle." /><div className="grid gap-6 md:grid-cols-4">{LANDING_STEPS.map((step) => <article key={step.title} className="rounded-2xl border border-[#ddd6fe] p-6"><div aria-hidden="true" className="mb-5 grid size-11 place-items-center rounded-xl bg-forest text-xl text-accent">✦</div><p className="text-xs font-bold uppercase tracking-wider text-brand">{step.title}</p><h3 className="mt-3 text-lg font-bold text-foreground">{step.heading}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p><ul className="mt-5 grid gap-2 text-sm text-foreground">{step.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><span aria-hidden="true" className="text-brand">✓</span>{bullet}</li>)}</ul></article>)}</div></LandingSection>;
}
