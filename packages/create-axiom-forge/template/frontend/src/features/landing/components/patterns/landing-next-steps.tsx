import type { ReactElement } from "react";

import { LANDING_LOGIN_PATH, LANDING_NEXT_STEPS } from "@landing/constants";

export function NextStepsSection(): ReactElement {
  return <section id="next-steps" className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28"><div className="rounded-3xl bg-forest p-8 text-white shadow-2xl sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Próximos passos</p><h2 className="mt-4 text-3xl font-black">O produto começa <span className="text-accent">depois daqui</span></h2><p className="mt-4 max-w-2xl text-white/70">Use a base técnica, apague os placeholders e registre as decisões reais do seu projeto.</p><ul className="mt-6 grid gap-3 text-sm text-white/85 md:grid-cols-2">{LANDING_NEXT_STEPS.map((step) => <li key={step} className="flex gap-2"><span aria-hidden="true" className="text-accent">✓</span>{step}</li>)}</ul><a href={LANDING_LOGIN_PATH} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-sm font-bold text-accent-foreground transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Abrir o app <span aria-hidden="true">→</span></a></div></section>;
}
