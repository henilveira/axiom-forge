import type { ReactNode } from "react";

export type LandingContentProps = Readonly<{ children: ReactNode }>;
export type LandingLinkProps = Readonly<{ href: string; label: string }>;
export type LandingSectionProps = Readonly<{ children: ReactNode; id?: string; className?: string }>;
export type LandingHeadingProps = Readonly<{ eyebrow: string; title: string; subtitle: string }>;
