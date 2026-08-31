import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, render, useApp, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";

import {
  ARCHITECTURES,
  AUTH_TEMPLATES,
  BACKEND_DESIGNS,
  BACKEND_STACKS,
  BROKERS,
  DATABASES,
  FRONTEND_DESIGNS,
  FRONTEND_STACKS,
  PROJECT_MODES,
  PROVIDERS,
  OPTION_GUIDANCE,
  compatibleDesigns,
  getOption,
} from "./catalog.mjs";

const h = React.createElement;

const COLORS = Object.freeze({
  ember: "#f0883e",
  gold: "#ffb454",
  flame: "#ff7b72",
  green: "#7ee787",
  cyan: "#79c0ff",
  white: "#f0f6fc",
  steel: "#8b949e",
  ash: "#484f58",
});

const RESET_AFTER = Object.freeze({
  mode: ["frontend", "frontendDesign", "backend", "backendDesign", "architecture", "database", "broker", "provider", "auth"],
  frontend: ["frontendDesign", "auth"],
  backend: ["backendDesign", "auth"],
  architecture: ["broker", "auth"],
  database: ["auth"],
  broker: ["auth"],
  provider: ["auth"],
});

function stackDesignOptions(options, stackOption) {
  const compatible = compatibleDesigns(options, stackOption.value);
  const preferred = (stackOption.systemDesigns ?? [])
    .map((value) => getOption(options, value))
    .filter(Boolean);
  return [...preferred, ...compatible.filter((option) => !preferred.some((item) => item.value === option.value))];
}

const RECOMMENDED_OPTIONS = Object.freeze({
  agents: "both",
  mode: "full",
  frontend: "nextjs",
  frontendDesign: "next-app-router",
  backend: "nestjs",
  backendDesign: "nest-modular",
  architecture: "modular-monolith",
  database: "postgres",
  broker: "rabbitmq",
  provider: "local",
  auth: "none",
});

function compatibleAuth(auth, selection) {
  const requirement = getOption(AUTH_TEMPLATES, auth)?.compatible;
  if (!requirement) return true;
  return Object.entries(requirement).every(([key, value]) => selection[key] === value);
}

function optionItems(options, group, recommendedValue = RECOMMENDED_OPTIONS[group]) {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
    guide: OPTION_GUIDANCE[group]?.[option.value],
    recommended: recommendedValue === option.value,
  }));
}

function buildSteps(values, agentOptions) {
  const steps = [
    {
      key: "agentTooling",
      title: "Quem vai trabalhar com você?",
      eyebrow: "AGENTES",
      hint: "Agentes são instruções especializadas para Claude e Codex. Você pode instalar uma ferramenta ou as duas.",
      options: optionItems(agentOptions, "agents"),
    },
    {
      key: "mode",
      title: "O que você quer criar?",
      eyebrow: "ESCOPO",
      hint: "Escolha as partes do sistema que este projeto vai conter. Se ainda estiver em dúvida, comece com frontend + backend.",
      options: optionItems(PROJECT_MODES, "mode"),
    },
  ];
  const mode = values.mode;
  if (!mode) return steps;

  if (mode !== "backend") {
    const frontend = values.frontend;
    steps.push({
      key: "frontend",
      title: "Como será a interface?",
      eyebrow: "FRONTEND",
      hint: "Frontend é a parte que a pessoa usa no navegador. Se você quer uma recomendação geral, escolha Next.js.",
      options: optionItems(FRONTEND_STACKS, "frontend"),
    });
    if (frontend) {
      const stack = getOption(FRONTEND_STACKS, frontend);
      steps.push({
        key: "frontendDesign",
        title: "Como organizar o frontend?",
        eyebrow: "FRONTEND DESIGN",
        hint: "System design é a forma de separar arquivos e responsabilidades. A recomendação inicial é o design marcado para a stack escolhida.",
        options: optionItems(stackDesignOptions(FRONTEND_DESIGNS, stack), "frontendDesign", stack.systemDesigns?.[0]),
      });
    }
  }

  if (mode !== "frontend") {
    const backend = values.backend;
    steps.push({
      key: "backend",
      title: "Como será o serviço?",
      eyebrow: "BACKEND",
      hint: "Backend é a parte que processa requisições, acessa dados e executa regras técnicas. Se ainda estiver em dúvida, escolha NestJS.",
      options: optionItems(BACKEND_STACKS, "backend"),
    });
    if (backend) {
      const stack = getOption(BACKEND_STACKS, backend);
      steps.push({
        key: "backendDesign",
        title: "Como organizar o backend?",
        eyebrow: "BACKEND DESIGN",
        hint: "Escolha uma organização que combine com o tamanho do sistema e a experiência da equipe. Não existe uma opção melhor para todos os casos.",
        options: optionItems(stackDesignOptions(BACKEND_DESIGNS, stack), "backendDesign", stack.systemDesigns?.[0]),
      });
    }
  }

  const architectureOptions = mode === "frontend" ? ARCHITECTURES.filter((option) => !option.requiresBroker) : ARCHITECTURES;
  steps.push({
    key: "architecture",
    title: "Como as partes vão se comunicar?",
    eyebrow: "ARQUITETURA",
    hint: "Arquitetura define como os componentes se dividem e conversam. Se o produto ainda está sendo descoberto, prefira monólito modular.",
    options: optionItems(architectureOptions, "architecture"),
  });

  if (mode !== "frontend") {
    steps.push({
      key: "database",
      title: "Onde os dados serão guardados?",
      eyebrow: "BANCO DE DADOS",
      hint: "Banco de dados é onde o estado do sistema fica persistido. Se você ainda não sabe, escolha PostgreSQL ou nenhum banco para um protótipo.",
      options: optionItems(DATABASES, "database"),
    });
    const brokerRecommendation = values.architecture === "event-driven" ? "rabbitmq" : "none";
    const brokerOptions = values.architecture === "event-driven" ? BROKERS.filter((option) => option.value !== "none") : BROKERS;
    steps.push({
      key: "broker",
      title: "Você precisa de mensagens assíncronas?",
      eyebrow: "BROKER",
      hint: "Broker é um serviço que recebe mensagens e entrega para outros componentes. Ele é necessário quando tarefas ou eventos não precisam acontecer na mesma chamada.",
      options: optionItems(brokerOptions, "broker", brokerRecommendation),
    });
  }

  const providerOptions = mode === "backend" ? PROVIDERS.filter((option) => !option.frontendOnly) : PROVIDERS;
  steps.push({
    key: "provider",
    title: "Onde você pretende executar?",
    eyebrow: "PROVIDER",
    hint: "Provider é a plataforma que hospeda a aplicação. Para começar sem custo e sem credenciais externas, escolha local + Docker Compose.",
    options: optionItems(providerOptions, "provider"),
  });

  const authCompatible = compatibleAuth("axiom-foundation", {
    mode,
    frontend: values.frontend,
    backend: values.backend,
    database: values.database,
    broker: values.broker,
    provider: values.provider,
  });
  steps.push({
    key: "auth",
    title: "Você precisa de autenticação pronta?",
    eyebrow: "AUTH TEMPLATE",
    hint: authCompatible
      ? "Autenticação cuida de login, sessão e verificação de identidade. Se o produto ainda não precisa de login, escolha sem autenticação pronta."
      : "A autenticação pronta não é compatível com este perfil. Você pode começar sem ela e criar a própria implementação depois.",
    options: optionItems(authCompatible ? AUTH_TEMPLATES : [AUTH_TEMPLATES[0]], "auth"),
  });
  return steps;
}

function normalizeSelection(values) {
  const mode = values.mode;
  return {
    agentTooling: values.agentTooling,
    mode,
    frontend: mode === "backend" ? null : values.frontend,
    frontendDesign: mode === "backend" ? null : values.frontendDesign,
    backend: mode === "frontend" ? null : values.backend,
    backendDesign: mode === "frontend" ? null : values.backendDesign,
    architecture: values.architecture,
    database: mode === "frontend" ? "none" : values.database,
    broker: mode === "frontend" ? "none" : values.broker,
    provider: values.provider,
    auth: values.auth,
  };
}

function Header({ current, total, title, eyebrow, width }) {
  const barWidth = Math.min(30, Math.max(18, width - 36));
  const filled = Math.max(1, Math.round((current / total) * barWidth));
  return h(Box, { flexDirection: "column", marginBottom: 1, width },
    h(Text, { color: COLORS.gold, bold: true }, `⚒ AXIOM FORGE  ·  ${eyebrow}`),
    h(Text, { color: COLORS.white, bold: true }, title),
    h(Box, { flexDirection: "row" },
      h(Text, { color: COLORS.gold }, "━".repeat(filled)),
      h(Text, { color: COLORS.ash }, "━".repeat(barWidth - filled)),
      h(Text, { color: COLORS.steel }, `  ${current}/${total}`),
    ),
  );
}

const PET_FRAMES = Object.freeze(["=^.^=", "=^o^=", "=^-^=", "=^.^="]);

function ForgePet({ message, width }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((current) => (current + 1) % PET_FRAMES.length), 520);
    return () => clearInterval(timer);
  }, []);
  return h(Box, { flexDirection: "row", marginTop: 1, width },
    h(Text, { color: COLORS.gold, bold: true }, `${PET_FRAMES[frame]}  `),
    h(Text, { color: COLORS.cyan, wrap: "wrap" }, `Faísca: ${message}`),
  );
}

function labelFor(options, value) {
  return getOption(options, value)?.label ?? value;
}

function SelectionContext({ values, width }) {
  const chosen = [
    ["escopo", values.mode, PROJECT_MODES],
    ["frontend", values.frontend, FRONTEND_STACKS],
    ["backend", values.backend, BACKEND_STACKS],
    ["arquitetura", values.architecture, ARCHITECTURES],
    ["banco", values.database, DATABASES],
    ["broker", values.broker, BROKERS],
    ["provider", values.provider, PROVIDERS],
  ].filter(([, value]) => value !== undefined && value !== null);
  if (chosen.length === 0) return null;
  const summary = chosen.map(([key, value, options]) => `${key}: ${labelFor(options, value)}`).join("  ·  ");
  return h(Box, { marginTop: 1, width },
    h(Text, { color: COLORS.steel, wrap: "wrap", width }, `Perfil já escolhido: ${summary}`),
  );
}

const PET_MESSAGES = Object.freeze({
  agentTooling: "eu instalo só as ferramentas que você escolher.",
  mode: "se você não souber, frontend + backend é o caminho mais completo.",
  frontend: "pense primeiro em onde a interface vai rodar e no que seu time já conhece.",
  frontendDesign: "o design organiza os arquivos, não cria regra de negócio.",
  backend: "a melhor escolha costuma ser a que seu time consegue operar bem.",
  backendDesign: "comece simples e aumente a separação quando ela trouxer benefício real.",
  architecture: "microservices e eventos têm custo operacional. Você não precisa deles por padrão.",
  database: "se os dados precisam sobreviver ao reinício, você precisa de persistência.",
  broker: "eu explico: broker é a caixa de mensagens entre partes do sistema.",
  provider: "local + Docker Compose é a forma mais simples de começar.",
  auth: "login é opcional. A regra de negócio continua sendo sua depois do scaffold.",
});

function SelectedOptionGuide({ option, width }) {
  const guide = option.guide ?? {
    what: option.description,
    when: "Quando essa opção fizer sentido para o seu projeto.",
    tradeoff: "Confira a documentação da stack antes de usar em produção.",
  };
  const innerWidth = Math.max(28, width - 4);
  return h(Box, { flexDirection: "column", borderStyle: "round", borderColor: COLORS.ash, paddingX: 1, marginTop: 1, width },
    h(Text, { color: COLORS.gold, bold: true, wrap: "wrap", width: innerWidth }, `${option.recommended ? "★ " : ""}${option.label}`),
    h(Text, { color: COLORS.white, wrap: "wrap", width: innerWidth }, `Resumo: ${option.description}`),
    h(Text, { color: COLORS.steel, wrap: "wrap", width: innerWidth }, `O que é: ${guide.what}`),
    h(Text, { color: COLORS.steel, wrap: "wrap", width: innerWidth }, `Quando usar: ${guide.when}`),
    h(Text, { color: COLORS.steel, wrap: "wrap", width: innerWidth }, `Custo ou cuidado: ${guide.tradeoff}`),
    guide.recommended
      ? h(Text, { color: COLORS.green, wrap: "wrap", width: innerWidth }, `Recomendação: ${guide.recommended}`)
      : null,
  );
}

function OptionMenu({ step, stepNumber, total, values, onSelect }) {
  const [cursor, setCursor] = useState(0);
  const { stdout } = useStdout();
  const width = Math.max(36, Math.min(94, (stdout.columns || 100) - 2));
  const options = step.options;
  const selected = options[cursor] ?? options[0];

  useInput((value, key) => {
    if (key.upArrow) setCursor((current) => (current - 1 + options.length) % options.length);
    if (key.downArrow) setCursor((current) => (current + 1) % options.length);
    if (key.return && selected) onSelect(selected.value);
    if (/^\d$/.test(value)) {
      const selectedIndex = Number(value) - 1;
      if (selectedIndex >= 0 && selectedIndex < options.length) onSelect(options[selectedIndex].value);
    }
  });

  return h(Box, { flexDirection: "column", width },
    h(Header, { current: stepNumber, total, title: step.title, eyebrow: step.eyebrow, width }),
    h(Text, { color: COLORS.white, wrap: "wrap", width }, step.hint),
    h(ForgePet, { message: PET_MESSAGES[step.key] ?? "vou ajudar você a escolher.", width }),
    h(SelectionContext, { values, width }),
    h(Box, { flexDirection: "column", marginTop: 1, width },
      h(Text, { color: COLORS.ember, bold: true }, "Escolha uma opção:"),
      ...options.map((option, index) => h(Box, { key: option.value, flexDirection: "row" },
        h(Text, { color: index === cursor ? COLORS.ember : COLORS.ash, bold: true, width: 6 }, index === cursor ? "❯ " : "  "),
        h(Text, { color: index === cursor ? COLORS.white : COLORS.steel, bold: index === cursor, wrap: "wrap" }, `${String(index + 1).padStart(2, "0")}  ${option.label}${option.recommended ? "  ★ recomendada" : ""}`),
      )),
    ),
    selected ? h(SelectedOptionGuide, { option: selected, width }) : null,
    h(Box, { marginTop: 1 },
      h(Text, { color: COLORS.ash, wrap: "wrap", width }, "↑ ↓ navegar  ·  Enter confirmar  ·  número selecionar  ·  Ctrl+C sair"),
    ),
  );
}

function ForgeProgress({ selection }) {
  const [stage, setStage] = useState(0);
  const stages = [
    "Aquecendo a forja",
    "Fundindo o perfil de stack",
    "Moldando os agentes especialistas",
    "Gravando contratos e infraestrutura",
  ];
  useEffect(() => {
    const timer = setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 360);
    return () => clearInterval(timer);
  }, [stages.length]);
  return h(Box, { flexDirection: "column" },
    h(Text, { color: COLORS.gold, bold: true }, "  ╭─ FORGE IN PROGRESS"),
    h(Text, { color: COLORS.ember }, "  │"),
    h(Box, { marginLeft: 2, flexDirection: "row" },
      h(Text, { color: COLORS.ember }, h(Spinner, { type: "dots" })),
      h(Text, { color: COLORS.white, bold: true }, `  ${stages[stage]}`),
    ),
    h(Text, { color: COLORS.steel }, `  │  ${selection.mode} · ${selection.frontend ?? "no-frontend"} · ${selection.backend ?? "no-backend"}`),
    h(ForgePet, { message: "aquecendo os arquivos e respeitando suas escolhas.", width: 72 }),
    h(Text, { color: COLORS.gold, bold: true }, "  ╰────────────────────────────────────────────"),
  );
}

function ForgeSuccess({ result }) {
  const { exit } = useApp();
  useEffect(() => {
    const timer = setTimeout(() => exit(), 850);
    return () => clearTimeout(timer);
  }, [exit]);
  return h(Box, { flexDirection: "column" },
    h(Text, { color: COLORS.green, bold: true }, "  ╭─ FORGE COMPLETE"),
    h(Text, { color: COLORS.green }, "  │"),
    h(Text, { color: COLORS.white, bold: true }, `  ✓ ${result.targetDirectory}`),
    h(Text, { color: COLORS.steel }, `  │  ${result.selection.mode} · ${result.selection.frontend ?? "no-frontend"} · ${result.selection.backend ?? "no-backend"}`),
    h(Text, { color: COLORS.steel }, `  │  agents: ${result.agentTooling} · db: ${result.selection.database} · broker: ${result.selection.broker}`),
    h(Text, { color: COLORS.green, bold: true }, "  ╰────────────────────────────────────────────"),
  );
}

function ForgeError({ error, onExit }) {
  useInput((value, key) => {
    if (key.return || value === "q") onExit();
  });
  return h(Box, { flexDirection: "column" },
    h(Text, { color: COLORS.flame, bold: true }, "  ╭─ FORGE HALTED"),
    h(Text, { color: COLORS.flame }, "  │"),
    h(Text, { color: COLORS.white }, `  ✗ ${error instanceof Error ? error.message : String(error)}`),
    h(Text, { color: COLORS.steel }, "  │  Pressione Enter ou q para sair."),
    h(Text, { color: COLORS.flame, bold: true }, "  ╰────────────────────────────────────────────"),
  );
}

function ForgeWizard({ initial, agentOptions, onForge, onSuccess, onFailure }) {
  const [values, setValues] = useState(() => ({ ...initial }));
  const [phase, setPhase] = useState("selecting");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const steps = useMemo(() => buildSteps(values, agentOptions), [values, agentOptions]);
  const pending = steps.find((step) => values[step.key] === undefined);
  const pendingIndex = pending ? steps.indexOf(pending) : steps.length;

  useEffect(() => {
    if (phase !== "selecting" || pending) return undefined;
    const selection = normalizeSelection(values);
    setPhase("forging");
    onForge(selection)
      .then((created) => {
        setResult(created);
        setPhase("success");
      })
      .catch((caught) => {
        setError(caught);
        setPhase("error");
      });
    return undefined;
  }, [onForge, pending, phase, values]);

  useEffect(() => {
    if (phase === "success" && result) onSuccess(result);
  }, [onSuccess, phase, result]);

  const select = (value) => {
    const key = pending.key;
    setValues((current) => {
      const next = { ...current, [key]: value };
      for (const resetKey of RESET_AFTER[key] ?? []) delete next[resetKey];
      return next;
    });
  };

  if (phase === "forging") return h(ForgeProgress, { selection: normalizeSelection(values) });
  if (phase === "success") return h(ForgeSuccess, { result });
  if (phase === "error") return h(ForgeError, { error, onExit: () => onFailure(error) });
  if (!pending) return null;
  return h(OptionMenu, { step: pending, stepNumber: pendingIndex + 1, total: steps.length, values, onSelect: select, key: pending.key });
}

export function runForgePrompt({ initial = {}, agentOptions, onForge }) {
  return new Promise((resolve, reject) => {
    let instance;
    const finish = (callback, value) => {
      callback(value);
      instance?.unmount();
    };
    instance = render(h(ForgeWizard, {
      initial,
      agentOptions,
      onForge,
      onSuccess: (result) => finish(resolve, result),
      onFailure: (error) => finish(reject, error),
    }), { exitOnCtrlC: true });
  });
}

export { buildSteps, normalizeSelection };
