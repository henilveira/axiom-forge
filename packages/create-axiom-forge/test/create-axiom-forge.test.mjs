import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import {
  AGENT_OPTIONS,
  createProject,
  deriveProjectNames,
  normalizeAgentProviders,
  parseArguments,
  resolveSelection,
  slugifyProjectName,
  transformTemplateText,
} from "../bin/create-axiom-forge.mjs";
import { buildSteps, normalizeSelection } from "../bin/forge-ui.mjs";

const execFileAsync = promisify(execFile);

test("normaliza o nome do projeto e deriva nomes seguros para infraestrutura", () => {
  assert.equal(slugifyProjectName("  Minha Plataforma Ágil  "), "minha-plataforma-agil");
  assert.deepEqual(deriveProjectNames("Minha Plataforma Ágil"), {
    displayName: "Minha Plataforma Ágil",
    projectSlug: "minha-plataforma-agil",
    databaseName: "minha_plataforma_agil",
    appIdentifier: "minhaplataformaagil",
  });
});

test("interpreta nome, agentes e diretório de saída", () => {
  assert.deepEqual(parseArguments(["minha-plataforma", "--agents", "codex", "--path", "/tmp/projetos"]), {
    projectName: "minha-plataforma",
    agentTooling: "codex",
    destination: "/tmp/projetos",
  });
  assert.throws(() => parseArguments(["minha-plataforma", "--agents", "invalid"]), /claude, codex ou both/);
  assert.deepEqual(parseArguments(["minha-plataforma", "--agents", "copilot,cursor"]), {
    projectName: "minha-plataforma",
    agentTooling: "copilot,cursor",
  });
  assert.deepEqual(normalizeAgentProviders("both"), ["claude", "codex"]);
  assert.equal(AGENT_OPTIONS.length >= 14, true);
});

test("executa o launcher quando npm ou npx o chama por um symlink", async () => {
  const directory = await mkdtemp(join(tmpdir(), "axiom-forge-bin-test-"));
  try {
    const binDirectory = join(directory, "node_modules", ".bin");
    const linkedBin = join(binDirectory, "create-axiom-forge");
    await mkdir(binDirectory, { recursive: true });
    await symlink(join(process.cwd(), "bin", "create-axiom-forge.mjs"), linkedBin);

    const result = await execFileAsync(process.execPath, [linkedBin, "--help"], { encoding: "utf8" });
    assert.match(result.stdout, /Uso: npx create-axiom-forge/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("aplica o namespace do projeto ao banco, Compose, RabbitMQ e CI", () => {
  const names = deriveProjectNames("Portal de Ideias");
  assert.match(
    transformTemplateText("COMPOSE_PROJECT_NAME=application\nDATABASE_URL=postgresql://user:password@localhost:5432/application?schema=public\nRABBITMQ_VHOST=/application-local\nRABBITMQ_EXCHANGE=application.events", ".env.example", names),
    /COMPOSE_PROJECT_NAME=portal-de-ideias[\s\S]*5432\/portal_de_ideias\?[\s\S]*\/portal-de-ideias-local[\s\S]*portal-de-ideias\.events/,
  );
  assert.match(
    transformTemplateText("name: application\nPOSTGRES_DB: application\ntest: [\"CMD-SHELL\", \"pg_isready -U user -d application\"]\nRABBITMQ_DEFAULT_VHOST: /application-local", "backend/docker-compose.yml", names),
    /name: portal-de-ideias[\s\S]*POSTGRES_DB: portal_de_ideias[\s\S]*-d portal_de_ideias[\s\S]*\/portal-de-ideias-local/,
  );
  assert.equal(transformTemplateText("DATABASE_URL=postgresql://localhost/application_ci", ".github/workflows/apps.yml", names), "DATABASE_URL=postgresql://localhost/portal_de_ideias_ci");
});

test("gera um projeto Claude-only sem arquivos do Codex", async () => {
  const destination = await mkdtemp(join(tmpdir(), "axiom-forge-test-"));
  try {
    const result = await createProject({ projectName: "Projeto Claude", agentTooling: "claude", destination });
    assert.equal(result.databaseName, "projeto_claude");
    assert.equal(await readFile(join(result.targetDirectory, ".project-config.json"), "utf8").then(JSON.parse).then((config) => config.agentTooling), "claude");
    await assert.rejects(readFile(join(result.targetDirectory, ".agents", "skills", "kickoff", "SKILL.md")));
    await readFile(join(result.targetDirectory, ".claude", "skills", "kickoff", "SKILL.md"));
    await assert.rejects(readFile(join(result.targetDirectory, "AGENTS.md")));
    assert.match(await readFile(join(result.targetDirectory, "docs", "engineering", "README.md"), "utf8"), /\.claude\/skills\/kickoff/);
    assert.doesNotMatch(await readFile(join(result.targetDirectory, "README.md"), "utf8"), /Criar um projeto derivado/);
    assert.match(await readFile(join(result.targetDirectory, "backend", "docker-compose.yml"), "utf8"), /POSTGRES_DB: projeto_claude/);
    assert.match(await readFile(join(result.targetDirectory, "backend", "docker-compose.yml"), "utf8"), /name: projeto-claude/);

    const codex = await createProject({ projectName: "Projeto Codex", agentTooling: "codex", destination });
    await readFile(join(codex.targetDirectory, ".agents", "skills", "kickoff", "SKILL.md"));
    await assert.rejects(readFile(join(codex.targetDirectory, ".claude", "skills", "kickoff", "SKILL.md")));
    await assert.rejects(readFile(join(codex.targetDirectory, "CLAUDE.md")));
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});

test("valida dependências e compatibilidade do catálogo", () => {
  assert.throws(() => resolveSelection({ mode: "backend", backend: "go-gin", architecture: "event-driven", broker: "none" }), /exige um broker/);
  assert.throws(() => resolveSelection({ mode: "frontend", frontend: "vite-react", frontendDesign: "next-app-router" }), /não é compatível/);
  assert.throws(() => resolveSelection({ mode: "backend", backend: "express", provider: "vercel" }), /somente de frontend/);
  assert.throws(() => resolveSelection({ mode: "full", frontend: "vite-react", backend: "express", auth: "axiom-foundation" }), /exige full/);
  assert.equal(resolveSelection({ mode: "frontend", frontend: "vite-vue", provider: "vercel" }).backend, null);
});

test("monta o wizard Ink conforme o escopo e normaliza camadas ausentes", () => {
  const agentOptions = [
    { value: "claude", label: "Claude", description: "" },
    { value: "codex", label: "Codex", description: "" },
    { value: "both", label: "Claude + Codex", description: "" },
  ];
  const frontendSteps = buildSteps({ mode: "frontend", frontend: "vite-vue" }, agentOptions);
  assert.deepEqual(frontendSteps.map((step) => step.key), [
    "agentTooling", "mode", "frontend", "frontendDesign", "architecture", "provider", "auth",
  ]);
  assert.match(frontendSteps.find((step) => step.key === "frontend").hint, /recomendação geral/);
  assert.equal(frontendSteps.find((step) => step.key === "frontend").options.some((option) => option.guide?.recommended), true);
  const backendSteps = buildSteps({ mode: "backend", backend: "go-gin", architecture: "event-driven" }, agentOptions);
  assert.equal(backendSteps.some((step) => step.key === "frontend"), false);
  const eventBrokerStep = backendSteps.find((step) => step.key === "broker");
  assert.equal(eventBrokerStep.options.some((option) => option.value === "none"), false);
  assert.equal(eventBrokerStep.options.find((option) => option.value === "rabbitmq").recommended, true);
  assert.match(eventBrokerStep.hint, /Broker é um serviço/);
  assert.match(eventBrokerStep.options.find((option) => option.value === "rabbitmq").guide.what, /filas/);
  const simpleBackendBrokerStep = buildSteps({ mode: "backend", backend: "nestjs", architecture: "modular-monolith" }, agentOptions).find((step) => step.key === "broker");
  assert.equal(simpleBackendBrokerStep.options.find((option) => option.value === "none").recommended, true);
  assert.equal(simpleBackendBrokerStep.options.find((option) => option.value === "rabbitmq").recommended, false);
  assert.deepEqual(normalizeSelection({ mode: "frontend", frontend: "vite-vue", frontendDesign: "vue-composition", provider: "vercel", auth: "none" }), {
    agentTooling: undefined,
    mode: "frontend",
    frontend: "vite-vue",
    frontendDesign: "vue-composition",
    backend: null,
    backendDesign: null,
    architecture: undefined,
    database: "none",
    broker: "none",
    provider: "vercel",
    auth: "none",
  });
});

test("gera projeto customizado somente com o perfil escolhido e especialistas compatíveis", async () => {
  const destination = await mkdtemp(join(tmpdir(), "axiom-forge-custom-test-"));
  try {
    const result = await createProject({
      projectName: "Custom App",
      agentTooling: "both",
      destination,
      mode: "full",
      frontend: "vite-react",
      frontendDesign: "feature-based",
      backend: "go-gin",
      backendDesign: "go-standard-layout",
      architecture: "event-driven",
      database: "mysql",
      broker: "kafka",
      provider: "aws",
      auth: "none",
    });
    assert.equal(result.selection.database, "mysql");
    assert.match(await readFile(join(result.targetDirectory, "docker-compose.yml"), "utf8"), /mysql:/);
    assert.match(await readFile(join(result.targetDirectory, "docker-compose.yml"), "utf8"), /apache\/kafka:4\.3\.1/);
    assert.match(await readFile(join(result.targetDirectory, "frontend", "src", "main.tsx"), "utf8"), /createRoot/);
    assert.match(await readFile(join(result.targetDirectory, "backend", "cmd", "api", "main.go"), "utf8"), /gin/);
    await readFile(join(result.targetDirectory, ".agents", "skills", "stack-frontend-vite-react", "SKILL.md"));
    await readFile(join(result.targetDirectory, ".claude", "agents", "stack-backend-go.md"));
    await assert.rejects(readFile(join(result.targetDirectory, ".agents", "skills", "stack-frontend-nextjs", "SKILL.md")));
    await assert.rejects(readFile(join(result.targetDirectory, "backend", "src", "auth", "auth.module.ts")));
    const profile = JSON.parse(await readFile(join(result.targetDirectory, ".axiom", "stack-profile.json"), "utf8"));
    assert.deepEqual(profile.specialists, ["stack-frontend-vite-react", "stack-backend-go", "architecture-event-driven", "database-mysql", "broker-kafka", "provider-aws"]);
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});

test("gera frontend-only sem runtime de backend nem infraestrutura", async () => {
  const destination = await mkdtemp(join(tmpdir(), "axiom-forge-frontend-test-"));
  try {
    const result = await createProject({
      projectName: "Visual Probe",
      agentTooling: "codex",
      destination,
      mode: "frontend",
      frontend: "vite-vue",
      frontendDesign: "vue-composition",
      provider: "vercel",
      auth: "none",
    });
    await readFile(join(result.targetDirectory, "frontend", "src", "App.vue"));
    await assert.rejects(readFile(join(result.targetDirectory, "backend", "README.md")));
    await assert.rejects(readFile(join(result.targetDirectory, "docker-compose.yml")));
    const profile = JSON.parse(await readFile(join(result.targetDirectory, ".project-config.json"), "utf8"));
    assert.equal(profile.selection.backend, null);
    assert.equal(profile.selection.database, "none");
    assert.equal(profile.selection.broker, "none");
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});

test("gera adapters nativos para os providers de agentes selecionados", async () => {
  const destination = await mkdtemp(join(tmpdir(), "axiom-forge-providers-test-"));
  const providers = ["claude", "codex", "copilot", "cursor", "windsurf", "kimi", "antigravity", "gemini", "cline", "roo", "kiro", "amazon-q", "continue", "opencode"];
  try {
    const result = await createProject({
      projectName: "Provider Matrix",
      agentTooling: providers,
      destination,
      mode: "full",
      frontend: "nextjs",
      frontendDesign: "next-app-router",
      backend: "nestjs",
      backendDesign: "nest-modular",
      architecture: "modular-monolith",
      database: "none",
      broker: "none",
      provider: "local",
      auth: "none",
    });
    assert.deepEqual(result.agentProviders, providers);
    const expectedFiles = [
      ".claude/agents/stack-frontend-nextjs.md",
      ".agents/skills/stack-frontend-nextjs/SKILL.md",
      ".github/agents/stack-frontend-nextjs.agent.md",
      ".github/skills/stack-frontend-nextjs/SKILL.md",
      ".cursor/rules/stack-frontend-nextjs.mdc",
      ".windsurf/skills/stack-frontend-nextjs/SKILL.md",
      ".windsurf/rules/stack-frontend-nextjs.md",
      ".windsurf/workflows/kickoff.md",
      ".kimi-code/agents/stack-frontend-nextjs.md",
      ".kimi/skills/stack-frontend-nextjs/SKILL.md",
      ".agents/rules/stack-frontend-nextjs.md",
      ".agents/workflows/kickoff.md",
      ".gemini/skills/stack-frontend-nextjs/SKILL.md",
      "GEMINI.md",
      ".gemini/commands/kickoff.toml",
      ".cline/skills/stack-frontend-nextjs/SKILL.md",
      ".clinerules/stack-frontend-nextjs.md",
      ".roo/rules/stack-frontend-nextjs.md",
      ".roomodes",
      ".kiro/agents/stack-frontend-nextjs.md",
      ".kiro/skills/stack-frontend-nextjs/SKILL.md",
      ".kiro/steering/axiom-forge.md",
      ".amazonq/rules/stack-frontend-nextjs.md",
      ".continue/rules/stack-frontend-nextjs.md",
      ".opencode/skills/stack-frontend-nextjs/SKILL.md",
    ];
    await Promise.all(expectedFiles.map((file) => readFile(join(result.targetDirectory, file))));
    const config = JSON.parse(await readFile(join(result.targetDirectory, ".project-config.json"), "utf8"));
    assert.deepEqual(config.agentProviders, providers);
    assert.match(await readFile(join(result.targetDirectory, ".roomodes"), "utf8"), /customModes/);
    assert.match(await readFile(join(result.targetDirectory, ".cursor/rules/stack-frontend-nextjs.mdc"), "utf8"), /alwaysApply: false/);
    assert.match(await readFile(join(result.targetDirectory, ".windsurf/rules/stack-frontend-nextjs.md"), "utf8"), /trigger: model_decision/);
  } finally {
    await rm(destination, { recursive: true, force: true });
  }
});
