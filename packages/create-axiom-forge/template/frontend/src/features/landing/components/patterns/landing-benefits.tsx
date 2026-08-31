import type { ReactElement } from "react";

import { LANDING_FEATURES } from "@landing/constants";
import { LandingHeading, LandingSection } from "./landing-section";

function getBenefitSizeClassName(variant: string): string {
  if (variant === "large") {
    return "md:col-span-2 md:row-span-2";
  }

  if (variant === "wide") {
    return "md:col-span-3";
  }

  return "";
}

export function BenefitsSection(): ReactElement {
  return <LandingSection id="features"><LandingHeading eyebrow="BASE TÉCNICA" title="Tudo pronto para o primeiro domínio" subtitle="A estrutura resolve o trabalho repetitivo de engenharia para você decidir apenas o que é específico do produto." /><div className="grid auto-rows-[minmax(190px,auto)] gap-5 md:grid-cols-3">{LANDING_FEATURES.map((benefit) => <article key={benefit.name} className={`group relative overflow-hidden rounded-3xl border border-[#ddd6fe] bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${getBenefitSizeClassName(benefit.variant)}`}><div className="relative z-10"><div aria-hidden="true" className="mb-8 grid size-12 place-items-center rounded-2xl bg-accent/25 text-2xl text-forest">{benefit.symbol}</div><h3 className="text-xl font-bold text-foreground">{benefit.name}</h3><p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">{benefit.description}</p></div><div aria-hidden="true" className="absolute -bottom-10 -right-6 text-[150px] font-black text-brand/[.06]">+</div>{benefit.badge === undefined ? null : <span className="absolute right-5 top-5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">{benefit.badge}</span>}</article>)}</div></LandingSection>;
}
