import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
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

function compatibleAuth(auth, selection) {
  const requirement = getOption(AUTH_TEMPLATES, auth)?.compatible;
  if (!requirement) return true;
  return Object.entries(requirement).every(([key, value]) => selection[key] === value);
}

function optionItems(options) {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));
}

function buildSteps(values, agentOptions) {
  const steps = [
    { key: "agentTooling", title: "Escolha o copiloto", eyebrow: "AGENT BAY", options: optionItems(agentOptions) },
    { key: "mode", title: "Defina o corpo do projeto", eyebrow: "SCOPE", options: optionItems(PROJECT_MODES) },
  ];
  const mode = values.mode;
  if (!mode) return steps;

  if (mode !== "backend") {
    const frontend = values.frontend;
    steps.push({ key: "frontend", title: "Escolha o motor de interface", eyebrow: "FRONTEND", options: optionItems(FRONTEND_STACKS) });
    if (frontend) {
      const stack = getOption(FRONTEND_STACKS, frontend);
      steps.push({
        key: "frontendDesign",
        title: "Escolha o system design do frontend",
        eyebrow: "FRONTEND DESIGN",
        options: optionItems(stackDesignOptions(FRONTEND_DESIGNS, stack)),
      });
    }
  }

  if (mode !== "frontend") {
    const backend = values.backend;
    steps.push({ key: "backend", title: "Escolha o motor de domínio", eyebrow: "BACKEND", options: optionItems(BACKEND_STACKS) });
    if (backend) {
      const stack = getOption(BACKEND_STACKS, backend);
      steps.push({
        key: "backendDesign",
        title: "Escolha o system design do backend",
        eyebrow: "BACKEND DESIGN",
        options: optionItems(stackDesignOptions(BACKEND_DESIGNS, stack)),
      });
    }
  }

  const architectureOptions = mode === "frontend" ? ARCHITECTURES.filter((option) => !option.requiresBroker) : ARCHITECTURES;
  steps.push({ key: "architecture", title: "Escolha o esqueleto arquitetural", eyebrow: "ARCHITECTURE", options: optionItems(architectureOptions) });

  if (mode !== "frontend") {
    steps.push({ key: "database", title: "Escolha o órgão de dados", eyebrow: "DATABASE", options: optionItems(DATABASES) });
    const brokerOptions = values.architecture === "event-driven" ? BROKERS.filter((option) => option.value !== "none") : BROKERS;
    steps.push({ key: "broker", title: "Escolha o sistema circulatório", eyebrow: "BROKER", options: optionItems(brokerOptions) });
  }

  const providerOptions = mode === "backend" ? PROVIDERS.filter((option) => !option.frontendOnly) : PROVIDERS;
  steps.push({ key: "provider", title: "Escolha o habitat de deploy", eyebrow: "PROVIDER", options: optionItems(providerOptions) });

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
    title: "Ativar template técnico de autenticação?",
    eyebrow: "AUTH TEMPLATE",
    options: optionItems(authCompatible ? AUTH_TEMPLATES : [AUTH_TEMPLATES[0]]),
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

function Header({ current, total, title, eyebrow }) {
  const width = 28;
  const filled = Math.max(1, Math.round((current / total) * width));
  return h(Box, { flexDirection: "column", marginBottom: 1 },
    h(Text, { color: COLORS.gold, bold: true }, "  ╭────────────────────────────────────────────╮"),
    h(Text, { color: COLORS.gold, bold: true }, "  │  ⚒  AXIOM FORGE  ·  STACK FOUNDRY          │"),
    h(Text, { color: COLORS.ember }, "  │     Shape the stack. Ship the hypothesis.   │"),
    h(Text, { color: COLORS.gold, bold: true }, "  ╰────────────────────────────────────────────╯"),
    h(Box, { marginTop: 1, flexDirection: "row" },
      h(Text, { color: COLORS.ember, bold: true }, `${eyebrow}  `),
      h(Text, { color: COLORS.white, bold: true }, title),
    ),
    h(Box, { flexDirection: "row" },
      h(Text, { color: COLORS.ember }, "  "),
      h(Text, { color: COLORS.gold }, "━".repeat(filled)),
      h(Text, { color: COLORS.ash }, "━".repeat(width - filled)),
      h(Text, { color: COLORS.steel }, `  ${current}/${total}`),
    ),
  );
}

function OptionMenu({ step, stepNumber, total, onSelect }) {
  const [cursor, setCursor] = useState(0);
  const options = step.options;

  useInput((value, key) => {
    if (key.upArrow) setCursor((current) => (current - 1 + options.length) % options.length);
    if (key.downArrow) setCursor((current) => (current + 1) % options.length);
    if (key.return) onSelect(options[cursor].value);
    if (/^\d$/.test(value)) {
      const selected = Number(value) - 1;
      if (selected >= 0 && selected < options.length) onSelect(options[selected].value);
    }
  });

  return h(Box, { flexDirection: "column" },
    h(Header, { current: stepNumber, total, title: step.title, eyebrow: step.eyebrow }),
    h(Text, { color: COLORS.steel }, "  O catálogo filtra as escolhas incompatíveis com o perfil atual."),
    h(Box, { flexDirection: "column", marginTop: 1 },
      ...options.map((option, index) => h(Box, { key: option.value, flexDirection: "row" },
        h(Text, { color: index === cursor ? COLORS.ember : COLORS.ash, bold: true, width: 7 }, index === cursor ? `  ❯ ${String(index + 1).padStart(2, "0")} ` : `    ${String(index + 1).padStart(2, "0")} `),
        h(Box, { width: 23, flexShrink: 0 },
          h(Text, { color: index === cursor ? COLORS.white : COLORS.steel, bold: index === cursor, wrap: "truncate-end" }, option.label),
        ),
        h(Box, { width: 46, flexShrink: 1 },
          h(Text, { color: COLORS.ash, wrap: "truncate-end" }, option.description),
        ),
      )),
    ),
    h(Box, { marginTop: 1 },
      h(Text, { color: COLORS.ash }, "  ↑ ↓ navegar  ·  Enter forjar  ·  número selecionar"),
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
  return h(OptionMenu, { step: pending, stepNumber: pendingIndex + 1, total: steps.length, onSelect: select, key: pending.key });
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
