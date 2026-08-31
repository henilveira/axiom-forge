export const LANDING_HEADER_SCROLL_THRESHOLD = 80;
export const LANDING_LOGIN_PATH = "/login";

export const LANDING_NAV_ITEMS = [
  { href: "#features", label: "Princípios", icon: "layers" },
  { href: "#how-it-works", label: "Fluxo", icon: "sparkles" },
  { href: "#next-steps", label: "Próximos passos", icon: "arrow-right" },
] as const;

export const LANDING_STATS = [
  { value: "01", label: "repositório" },
  { value: "03", label: "squads preparados" },
  { value: "∞", label: "produtos possíveis" },
  { value: "0", label: "regras de negócio" },
] as const;

export const LANDING_FEATURES = [
  {
    name: "Spec antes do código",
    description: "Transforme intenção em comportamento verificável antes de abrir uma lane de implementação.",
    icon: "layers",
    symbol: "◇",
    variant: "large",
    badge: "SDD",
  },
  {
    name: "Boundaries explícitas",
    description: "Mantenha Produto, Backend e Frontend com ownership e contratos claros.",
    icon: "zap",
    symbol: "✦",
    variant: "standard",
    badge: undefined,
  },
  {
    name: "Gates executáveis",
    description: "Use lint, typecheck, build e testes como evidência de entrega.",
    icon: "check",
    symbol: "✓",
    variant: "standard",
    badge: undefined,
  },
  {
    name: "Infra local pronta",
    description: "Suba Postgres e RabbitMQ localmente para desenvolver integrações reais.",
    icon: "plug",
    symbol: "↗",
    variant: "standard",
    badge: undefined,
  },
  {
    name: "Agentes coordenados",
    description: "Delegue por write-set, dependência, gate e handoff rastreável.",
    icon: "bot",
    symbol: "◎",
    variant: "wide",
    badge: undefined,
  },
] as const;

export const LANDING_STEPS = [
  {
    title: "1. Contextualize",
    icon: "layers",
    heading: "Comece pela intenção",
    description: "Registre o problema, a evidência e as perguntas que ainda podem mudar o produto.",
    bullets: ["Discovery explícito", "Hipóteses rotuladas", "OPEN-REQ para ambiguidades"],
  },
  {
    title: "2. Especifique",
    icon: "sparkles",
    heading: "Feche o comportamento",
    description: "Converta decisões em PRD, domínio, design, critérios de aceite e spec aprovada.",
    bullets: ["ACs testáveis", "Estados e erros", "Fonte e rastreabilidade"],
  },
  {
    title: "3. Implemente",
    icon: "zap",
    heading: "Delegue por camada",
    description: "Faça cada owner trabalhar em paths isolados, com contrato, dependências e rollback.",
    bullets: ["Worktrees próprias", "Contratos reais", "Um writer por arquivo compartilhado"],
  },
  {
    title: "4. Entregue",
    icon: "check",
    heading: "Feche com evidência",
    description: "Passe pelos gates, faça revisão de qualidade e segurança e publique com aprovação humana.",
    bullets: ["Testes verdes", "Secret scan", "Release-ready"],
  },
] as const;

export const LANDING_TESTIMONIALS = [
  {
    quote: "Substitua este bloco por evidência real do projeto derivado.",
    author: "Seu projeto",
    role: "Placeholder de pesquisa",
    initials: "SP",
  },
  {
    quote: "O boilerplate oferece estrutura; o produto começa quando o discovery começa.",
    author: "Decisão futura",
    role: "Placeholder de contexto",
    initials: "DF",
  },
  {
    quote: "Nenhuma métrica, persona ou promessa vem pronta neste repositório.",
    author: "Regra do template",
    role: "Sem contexto de negócio",
    initials: "RT",
  },
] as const;

export const LANDING_SOCIAL_LINKS = [] as const;

export const LANDING_NEXT_STEPS: readonly string[] = [
  "Defina seu contexto de produto",
  "Adicione specs e decisões aprovadas",
  "Conecte contratos entre as camadas",
  "Substitua os placeholders pela sua marca",
];

export const LANDING_LOGOS = [
  { name: "Product", icon: "layers", symbol: "◇" },
  { name: "Frontend", icon: "rocket", symbol: "↗" },
  { name: "Backend", icon: "server", symbol: "▣" },
  { name: "Quality", icon: "check", symbol: "✓" },
  { name: "Security", icon: "shield", symbol: "◈" },
] as const;

export const LANDING_FOOTER_GROUPS = [
  {
    title: "Navegação",
    links: [
      { label: "Princípios", href: "#features" },
      { label: "Fluxo", href: "#how-it-works" },
      { label: "Próximos passos", href: "#next-steps" },
    ],
  },
  {
    title: "Desenvolvimento",
    links: [
      { label: "Entrar", href: "/login" },
      { label: "Documentação", href: "#top" },
    ],
  },
] as const;

export const LANDING_BRAND = {
  ink: "#111827",
  forest: "#1e1b4b",
  green: "#6366f1",
  lime: "#c4b5fd",
  cream: "#f5f3ff",
} as const;
