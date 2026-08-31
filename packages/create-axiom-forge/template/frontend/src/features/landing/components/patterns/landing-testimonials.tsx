import type { ReactElement } from "react";

import { LANDING_TESTIMONIALS } from "@landing/constants";
import { LandingHeading, LandingSection } from "./landing-section";

export function TestimonialsSection(): ReactElement {
  return <LandingSection><LandingHeading eyebrow="SEM FICÇÃO" title="O boilerplate não inventa evidência" subtitle="Este espaço demonstra como substituir placeholders por pesquisa e decisões do projeto derivado." /><div className="grid gap-5 md:grid-cols-3">{LANDING_TESTIMONIALS.map((testimonial) => <article key={testimonial.author} className="rounded-3xl bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="mb-5 flex gap-1 text-brand"><span aria-hidden="true">◇◇◇</span><span className="sr-only">Placeholder de evidência</span></div><blockquote className="leading-relaxed text-foreground">“{testimonial.quote}”</blockquote><div className="mt-7 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-full bg-forest text-xs font-bold text-accent">{testimonial.initials}</div><div><p className="font-bold text-foreground">{testimonial.author}</p><p className="text-sm text-muted-foreground">{testimonial.role}</p></div></div></article>)}</div></LandingSection>;
}
