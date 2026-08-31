import type { ReactElement } from "react";

import { LANDING_FOOTER_GROUPS } from "@landing/constants";

export function FooterProfessional(): ReactElement {
  return (
    <footer className="bg-[#0a1f10] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <a href="#top" className="flex items-center gap-2" aria-label="Starter App - início">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-accent text-lg font-black text-foreground">R</span>
            <span className="text-lg font-bold">starter<span className="text-accent">app</span></span>
          </a>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">Um ponto de partida técnico para transformar ideias em produtos.</p>
        </div>
        {LANDING_FOOTER_GROUPS.map((group) => (
          <div key={group.title}><h3 className="font-bold">{group.title}</h3><div className="mt-4 grid gap-3">{group.links.map((link) => <a key={link.label} href={link.href} className="text-sm text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{link.label}</a>)}</div></div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 pt-6 text-center text-sm text-white/40">© 2026 Starter App. Substitua este conteúdo pelo projeto derivado.</div>
    </footer>
  );
}
