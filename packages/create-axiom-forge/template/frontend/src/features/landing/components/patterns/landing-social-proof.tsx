import type { ReactElement } from "react";

import { LANDING_LOGOS, LANDING_STATS } from "@landing/constants";

export function SocialProof(): ReactElement {
  return <section className="mx-auto w-full max-w-6xl px-6 py-16 pb-10"><p className="text-center text-sm font-semibold text-muted-foreground">Camadas preparadas para o seu próximo projeto</p><div className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-5 text-sm font-bold text-muted-foreground">{LANDING_LOGOS.map((logo) => <span key={logo.name}><span aria-hidden="true">{logo.symbol}</span> {logo.name}</span>)}</div><div className="mt-12 grid grid-cols-2 gap-8 border-t border-border pt-8 text-center md:grid-cols-4">{LANDING_STATS.map((stat) => <div key={stat.label}><strong className="text-3xl font-black text-foreground">{stat.value}</strong><p className="mt-1 text-sm text-muted-foreground">{stat.label}</p></div>)}</div></section>;
}
