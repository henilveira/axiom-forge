import type { ReactElement } from "react";

import { LANDING_LOGIN_PATH } from "@landing/constants";

export function CTAGeneric(): ReactElement {
  return <section className="bg-gradient-to-b from-[#4338ca] to-[#a78bfa] px-6 py-24 text-center text-white"><h2 className="text-4xl font-black">Pronto para definir o seu produto?</h2><p className="mx-auto mt-4 max-w-xl text-white/80">Copie a estrutura, substitua os placeholders e comece pelo primeiro problema real.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href={LANDING_LOGIN_PATH} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-bold text-forest transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Abrir o app <span aria-hidden="true">→</span></a><a href="#features" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 text-sm font-bold text-white transition hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Ver princípios</a></div></section>;
}
