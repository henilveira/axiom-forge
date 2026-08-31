import type { ReactElement } from "react";

import { LANDING_LOGIN_PATH } from "@landing/constants";

export function HeroProfessional(): ReactElement {
  return (
    <section className="relative flex min-h-[680px] items-center justify-center overflow-hidden bg-gradient-to-b from-[#111827] via-[#1e1b4b] to-[#6366f1] px-6 pb-28 pt-36 text-center text-white">
      <div className="absolute inset-0 opacity-[.08]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "42px 42px" }} aria-hidden="true" />
      <div className="absolute -left-20 -top-20 size-80 rounded-full bg-accent/10" aria-hidden="true" />
      <div className="absolute -bottom-16 left-1/3 size-64 rounded-full bg-accent/10" aria-hidden="true" />
      <div className="relative max-w-4xl">
        <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90"><span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />Starter técnico para novos produtos</div>
        <h1 className="text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-7xl lg:text-8xl">Comece com<br /><span className="text-accent">clareza estrutural</span></h1>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/75 sm:text-xl">Um boilerplate neutro para transformar intenção em software testável usando SDD, Next.js, NestJS e agentes coordenados.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm font-medium text-white/90"><span><span aria-hidden="true">◇</span> Product</span><span><span aria-hidden="true">↗</span> Frontend</span><span><span aria-hidden="true">▣</span> Backend</span></div>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><a href={LANDING_LOGIN_PATH} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-bold text-accent-foreground transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">Abrir o app <span aria-hidden="true">→</span></a><a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 text-sm font-bold text-white transition hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span aria-hidden="true">▶</span> Ver o fluxo</a></div>
      </div>
      <div className="absolute -bottom-px left-0 h-28 w-full bg-background" style={{ clipPath: "ellipse(58% 62% at 50% 100%)" }} aria-hidden="true" />
    </section>
  );
}
