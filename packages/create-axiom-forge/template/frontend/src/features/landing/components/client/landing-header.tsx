"use client";

import { useEffect, useState } from "react";

import type { ReactElement } from "react";

import {
  LANDING_HEADER_SCROLL_THRESHOLD,
  LANDING_LOGIN_PATH,
  LANDING_NAV_ITEMS,
} from "@landing/constants";

export function LandingHeader(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = (): void => { setScrolled(window.scrollY > LANDING_HEADER_SCROLL_THRESHOLD); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav className={`mx-auto flex items-center justify-between transition-all duration-500 ${scrolled ? "w-[90%] max-w-5xl rounded-full bg-background/85 px-6 py-2.5 shadow-lg backdrop-blur-lg" : "w-full max-w-6xl px-2 py-4"}`} aria-label="Navegação principal">
        <a href="#top" className="flex items-center gap-2" aria-label="Starter App - início">
          <span aria-hidden="true" className={`grid size-9 place-items-center rounded-xl text-lg font-black ${scrolled ? "bg-brand text-white" : "bg-accent text-foreground"}`}>A</span>
          <span className={`text-lg font-bold tracking-tight ${scrolled ? "text-foreground" : "text-white"}`}>starter<span className={scrolled ? "text-brand" : "text-accent"}>app</span></span>
        </a>
        <div className="hidden items-center gap-8 lg:flex">
          {LANDING_NAV_ITEMS.map((item) => <a key={item.href} href={item.href} className={`relative py-1 text-sm font-medium transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${scrolled ? "text-foreground" : "text-white"}`}>{item.label}<span className="absolute inset-x-0 -bottom-1 h-0.5 origin-left scale-x-0 bg-accent transition-transform hover:scale-x-100" /></a>)}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <a href={LANDING_LOGIN_PATH} className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${scrolled ? "text-foreground" : "text-white"}`}>Entrar</a>
          <a href={LANDING_LOGIN_PATH} className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">Abrir o app</a>
        </div>
        <button type="button" aria-expanded={open} aria-controls="landing-mobile-menu" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => { setOpen((value) => !value); }} className={`rounded-xl border p-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden ${scrolled ? "border-border text-foreground" : "border-white/20 text-white"}`}>
          <span aria-hidden="true" className="text-xl leading-none">{open ? "×" : "☰"}</span>
        </button>
      </nav>
      {open ? <div id="landing-mobile-menu" className="mx-auto mt-3 max-w-sm rounded-2xl bg-white p-5 shadow-2xl md:hidden"><div className="grid gap-2">{LANDING_NAV_ITEMS.map((item) => <a key={item.href} href={item.href} onClick={() => { setOpen(false); }} className="rounded-xl px-4 py-3 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">{item.label}</a>)}<a href={LANDING_LOGIN_PATH} onClick={() => { setOpen(false); }} className="mt-2 rounded-xl border border-brand px-4 py-3 text-center font-semibold text-forest">Entrar</a></div></div> : null}
    </header>
  );
}
