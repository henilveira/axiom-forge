export type LandingIconName =
  | "arrow-right"
  | "bar-chart"
  | "bot"
  | "briefcase"
  | "building"
  | "check"
  | "chevron-right"
  | "coins"
  | "credit-card"
  | "globe"
  | "instagram"
  | "layers"
  | "linkedin"
  | "mail"
  | "message-square"
  | "menu"
  | "play"
  | "plug"
  | "quote"
  | "rocket"
  | "send"
  | "shopping-cart"
  | "sparkles"
  | "star"
  | "spotify"
  | "store"
  | "trending-up"
  | "twitter"
  | "user-check"
  | "x"
  | "youtube"
  | "zap";

export type LandingNavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: LandingIconName;
};

export type LandingStat = {
  readonly value: string;
  readonly label: string;
};

export type LandingFeature = {
  readonly name: string;
  readonly description: string;
  readonly icon: LandingIconName;
  readonly symbol: string;
  readonly variant: "large" | "standard" | "wide";
  readonly badge?: string;
};

export type LandingStep = {
  readonly title: string;
  readonly icon: LandingIconName;
  readonly heading: string;
  readonly description: string;
  readonly bullets: readonly string[];
};

export type LandingTestimonial = {
  readonly quote: string;
  readonly author: string;
  readonly role: string;
  readonly initials: string;
};

export type LandingSocialLink = {
  readonly label: string;
  readonly href: string;
  readonly icon: LandingIconName;
};

export type LandingLogo = {
  readonly name: string;
  readonly icon: LandingIconName;
  readonly symbol: string;
};

export type LandingFooterLink = {
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
};

export type LandingFooterGroup = {
  readonly title: string;
  readonly links: readonly LandingFooterLink[];
};
