#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import {
  ARCHITECTURES,
  AUTH_TEMPLATES,
  BACKEND_DESIGNS,
  BACKEND_STACKS,
  BROKERS,
  CATALOG_VERSION,
  DATABASES,
  FRONTEND_DESIGNS,
  FRONTEND_STACKS,
  PROJECT_MODES,
  PROVIDERS,
  SPECIALIST_LIBRARY,
  compatibleDesigns,
  defaultDesign,
  getOption,
} from "./catalog.mjs";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = join(PACKAGE_ROOT, "template");

export const AGENT_OPTIONS = Object.freeze([
  { value: "claude", label: "Claude", description: "instala skills e agentes Claude" },
  { value: "codex", label: "Codex", description: "instala skills e instruções Codex" },
  { value: "both", label: "Claude + Codex", description: "instala os dois conjuntos" },
]);

const SELECTION_KEYS = [
  "mode", "frontend", "frontendDesign", "backend", "backendDesign",
  "architecture", "database", "broker", "provider", "auth",
];

export function slugifyProjectName(value) {
  const slug = String(value)
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 53);
  if (!slug) throw new Error("O nome precisa conter ao menos uma letra ou número.");
  return slug;
}

export function deriveProjectNames(value) {
  const displayName = String(value).trim().replace(/\s+/g, " ");
  if (!displayName) throw new Error("Informe um nome para o projeto.");
  if (displayName.length > 80) throw new Error("O nome do projeto deve ter no máximo 80 caracteres.");
  const projectSlug = slugifyProjectName(displayName);
  const databaseName = projectSlug.replace(/-/g, "_").slice(0, 63);
  return Object.freeze({
    displayName,
    projectSlug,
    databaseName: databaseName || "application",
    appIdentifier: projectSlug.replace(/-/g, "").slice(0, 50) || "application",
  });
}

function valueAfter(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) throw new Error(`${option} precisa receber um valor.`);
  return value;
}

export function parseArguments(argv) {
  let projectName;
  const parsed = {};
  const aliases = new Map([
    ["agents", "agentTooling"], ["mode", "mode"], ["frontend", "frontend"],
    ["frontend-design", "frontendDesign"], ["backend", "backend"],
    ["backend-design", "backendDesign"], ["architecture", "architecture"],
    ["database", "database"], ["broker", "broker"], ["provider", "provider"],
    ["auth", "auth"], ["path", "destination"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return Object.freeze({ help: true });
    if (argument === "--catalog") return Object.freeze({ catalog: true });
    if (argument === "--yes" || argument === "-y") { parsed.yes = true; continue; }
    if (argument === "-a") { parsed.agentTooling = valueAfter(argv, index++, argument); continue; }
    if (argument.startsWith("--")) {
      const raw = argument.slice(2);
      const equals = raw.indexOf("=");
      const name = equals === -1 ? raw : raw.slice(0, equals);
      const key = aliases.get(name);
      if (!key) throw new Error(`Opção desconhecida: ${argument}`);
      const value = equals === -1 ? valueAfter(argv, index++, argument) : raw.slice(equals + 1);
      parsed[key] = value;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Opção desconhecida: ${argument}`);
    if (projectName !== undefined) throw new Error("Informe somente um nome de projeto.");
    projectName = argument;
  }
  if (parsed.agentTooling !== undefined && !AGENT_OPTIONS.some((option) => option.value === parsed.agentTooling)) {
    throw new Error("--agents deve ser claude, codex ou both.");
  }
  return Object.freeze({ projectName, ...parsed });
}

function assertAgentTooling(agentTooling) {
  if (!AGENT_OPTIONS.some((option) => option.value === agentTooling)) {
    throw new Error("Escolha de agentes inválida. Use claude, codex ou both.");
  }
}

function assertOption(options, value, label) {
  const option = getOption(options, value);
  if (!option) throw new Error(`${label} inválido: ${value}. Use --catalog para ver as opções.`);
  return option;
}

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

export function resolveSelection(input = {}) {
  const hasExplicitSelection = SELECTION_KEYS.some((key) => input[key] !== undefined);
  if (!hasExplicitSelection) {
    return Object.freeze({
      mode: "full", frontend: "nextjs", frontendDesign: "next-app-router",
      backend: "nestjs", backendDesign: "nest-modular", architecture: "event-driven",
      database: "postgres", broker: "rabbitmq", provider: "local", auth: "axiom-foundation",
      legacyAuth: true,
    });
  }

  const mode = input.mode ?? "full";
  assertOption(PROJECT_MODES, mode, "Modo");
  const frontend = mode === "backend" ? null : (input.frontend ?? "nextjs");
  const backend = mode === "frontend" ? null : (input.backend ?? "nestjs");
  if (frontend) assertOption(FRONTEND_STACKS, frontend, "Frontend");
  if (backend) assertOption(BACKEND_STACKS, backend, "Backend");
  const frontendOption = frontend ? getOption(FRONTEND_STACKS, frontend) : null;
  const backendOption = backend ? getOption(BACKEND_STACKS, backend) : null;
  const frontendDesign = frontend ? (input.frontendDesign ?? frontendOption.systemDesigns[0] ?? defaultDesign(FRONTEND_DESIGNS, frontend)) : null;
  const backendDesign = backend ? (input.backendDesign ?? backendOption.systemDesigns[0] ?? defaultDesign(BACKEND_DESIGNS, backend)) : null;
  if (frontend && !stackDesignOptions(FRONTEND_DESIGNS, frontendOption).some((item) => item.value === frontendDesign)) {
    throw new Error(`O design de frontend '${frontendDesign}' não é compatível com ${frontend}.`);
  }
  if (backend && !stackDesignOptions(BACKEND_DESIGNS, backendOption).some((item) => item.value === backendDesign)) {
    throw new Error(`O design de backend '${backendDesign}' não é compatível com ${backend}.`);
  }
  const architecture = input.architecture ?? "modular-monolith";
  const architectureOption = assertOption(ARCHITECTURES, architecture, "Arquitetura");
  const database = input.database ?? "none";
  const broker = input.broker ?? "none";
  const provider = input.provider ?? "local";
  assertOption(DATABASES, database, "Banco");
  const brokerOption = assertOption(BROKERS, broker, "Broker");
  const providerOption = assertOption(PROVIDERS, provider, "Provider");
  if (mode === "frontend" && (database !== "none" || broker !== "none")) {
    throw new Error("Um projeto somente frontend não pode gerar banco ou broker; use none.");
  }
  if (mode === "backend" && providerOption.frontendOnly) {
    throw new Error(`${provider} é um provider somente de frontend neste catálogo.`);
  }
  if (mode === "frontend" && architectureOption.requiresBroker) {
    throw new Error("Event-Driven Architecture exige um backend; escolha outro estilo para um projeto somente frontend.");
  }
  if (architectureOption.requiresBroker && broker === "none") {
    throw new Error("Event-Driven Architecture exige um broker. Escolha RabbitMQ, Kafka, NATS ou Redis Streams.");
  }
  const auth = input.auth ?? "none";
  assertOption(AUTH_TEMPLATES, auth, "Template de autenticação");
  const selection = { mode, frontend, frontendDesign, backend, backendDesign, architecture, database, broker, provider, auth };
  if (auth !== "none" && !compatibleAuth(auth, selection)) {
    throw new Error("O template de autenticação escolhido exige full + Next.js + NestJS + PostgreSQL + RabbitMQ + local.");
  }
  return Object.freeze(selection);
}

export function transformTemplateText(content, filePath, names) {
  let result = content;
  for (const [search, replacement] of [
    ["Axiom Forge", names.displayName], ["axiom-forge", names.projectSlug],
    ["axiom-forge-home", `${names.projectSlug}-home`], ["Starter App", names.displayName],
    ["starterapp", names.appIdentifier],
  ]) result = result.split(search).join(replacement);
  if (filePath === ".env.example" || filePath === "backend/.env.example") {
    result = result.split("COMPOSE_PROJECT_NAME=application").join(`COMPOSE_PROJECT_NAME=${names.projectSlug}`);
    result = result.split("5432/application?").join(`5432/${names.databaseName}?`);
    result = result.split("/application-local").join(`/${names.projectSlug}-local`);
    result = result.split("application.events").join(`${names.projectSlug}.events`);
  }
  if (filePath === "backend/docker-compose.yml") {
    result = result.split("name: application").join(`name: ${names.projectSlug}`);
    result = result.split("POSTGRES_DB: application").join(`POSTGRES_DB: ${names.databaseName}`);
    result = result.split("-d application").join(`-d ${names.databaseName}`);
    result = result.split("/application-local").join(`/${names.projectSlug}-local`);
  }
  if (filePath === ".github/workflows/apps.yml") result = result.split("application_ci").join(`${names.databaseName}_ci`);
  return result;
}

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path, relativePath));
    else files.push({ path, relativePath: relativePath.replaceAll("\\", "/") });
  }
  return files;
}

async function renderTemplate(targetDirectory, names) {
  for (const file of await listFiles(targetDirectory)) {
    const buffer = await readFile(file.path);
    if (buffer.includes(0)) continue;
    const source = buffer.toString("utf8");
    const rendered = transformTemplateText(source, file.relativePath, names);
    if (rendered !== source) await writeFile(file.path, rendered);
  }
}

function specialistIds(selection) {
  const ids = [];
  const frontend = getOption(FRONTEND_STACKS, selection.frontend);
  const backend = getOption(BACKEND_STACKS, selection.backend);
  const architecture = getOption(ARCHITECTURES, selection.architecture);
  const database = getOption(DATABASES, selection.database);
  const broker = getOption(BROKERS, selection.broker);
  const provider = getOption(PROVIDERS, selection.provider);
  for (const option of [frontend, backend, architecture, database, broker, provider]) {
    if (option?.specialist) ids.push(option.specialist);
  }
  return ids;
}

function skillText(id) {
  const specialist = SPECIALIST_LIBRARY[id];
  return [
    `---\nname: ${id}\ndescription: Especialista selecionado para ${specialist.title}.\nalwaysApply: false\n---`,
    "",
    `# ${specialist.title}`,
    "",
    `Foco: ${specialist.focus}.`,
    "",
    "## Regras de execução",
    "",
    ...specialist.rules.map((rule) => `- ${rule}`),
    "",
    "Este agente complementa o roster de processo do Axiom Forge. Ele não cria regra de negócio sem uma spec APPROVED.",
    "",
  ].join("\n");
}

function claudeAgentText(id) {
  const specialist = SPECIALIST_LIBRARY[id];
  return [
    `---\nname: ${id}\ndescription: Especialista selecionado para ${specialist.title}.\nalwaysApply: false\nmodel: sonnet\nisolation: worktree\ntools: Read, Write, Edit, Bash, Glob, Grep\n---`,
    "",
    `# ${specialist.title}`,
    "",
    `Foco: ${specialist.focus}.`,
    "",
    "## Regras",
    "",
    ...specialist.rules.map((rule) => `- ${rule}`),
    "- Respeite o AGENTS.md, o estado da task e os gates do projeto.",
    "- Não invente domínio, credenciais ou dependências fora da aprovação.",
    "",
  ].join("\n");
}

async function installAgentTooling(targetDirectory, agentTooling, selection) {
  assertAgentTooling(agentTooling);
  const selected = new Set(specialistIds(selection));
  for (const id of Object.keys(SPECIALIST_LIBRARY)) {
    await rm(join(targetDirectory, ".agents", "skills", id), { recursive: true, force: true });
    await rm(join(targetDirectory, ".claude", "agents", `${id}.md`), { recursive: true, force: true });
    if (!selected.has(id)) continue;
    if (agentTooling === "codex" || agentTooling === "both") {
      const path = join(targetDirectory, ".agents", "skills", id, "SKILL.md");
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, skillText(id));
    }
    if (agentTooling === "claude" || agentTooling === "both") {
      const path = join(targetDirectory, ".claude", "agents", `${id}.md`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, claudeAgentText(id));
    }
  }
  if (agentTooling === "both") return;
  const removeCodex = agentTooling === "claude";
  const directoryName = removeCodex ? ".agents" : ".claude";
  const instructionName = removeCodex ? "AGENTS.md" : "CLAUDE.md";
  const paths = [directoryName, `backend/${directoryName}`, `frontend/${directoryName}`, `product/${directoryName}`, instructionName, `backend/${instructionName}`, `frontend/${instructionName}`, `product/${instructionName}`];
  if (removeCodex) paths.push("backend/scripts/validate-agent-parity.py", "frontend/scripts/validate-agent-parity.py", "product/scripts/validate-agent-parity.py");
  await Promise.all(paths.map((path) => rm(join(targetDirectory, path), { recursive: true, force: true })));
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function envKey(selection) {
  return selection.database === "mongodb" ? "MONGODB_URL" : "DATABASE_URL";
}

function databaseUrl(selection, names) {
  const option = getOption(DATABASES, selection.database);
  return option?.url?.replaceAll("{database}", names.databaseName) ?? "";
}

function rootEnvText(selection, names) {
  const lines = [
    `# Variáveis locais geradas para ${names.displayName}. Nunca commite valores reais.`,
    "# Slug usado para nomes locais e automações.",
    `PROJECT_SLUG=${names.projectSlug}`,
    "# Nome lógico do banco derivado do projeto.",
    `PROJECT_DATABASE_NAME=${names.databaseName}`,
  ];
  if (selection.database !== "none") lines.push("# Conexão local do banco selecionado.", `${envKey(selection)}=${databaseUrl(selection, names)}`);
  if (selection.broker !== "none") lines.push("# Endpoint local do broker selecionado.", `BROKER_URL=${getOption(BROKERS, selection.broker).url}`);
  if (selection.provider !== "local") lines.push(`# O provider ${selection.provider} exige credenciais/configuração fora deste scaffold; não coloque secrets aqui.`);
  return `${lines.join("\n")}\n`;
}

function composeText(selection, names) {
  const services = [];
  const volumes = [];
  const database = getOption(DATABASES, selection.database);
  if (database?.service) {
    const env = selection.database === "postgres"
      ? [`POSTGRES_USER: user`, `POSTGRES_PASSWORD: password`, `POSTGRES_DB: ${names.databaseName}`]
      : selection.database === "mysql"
        ? [`MYSQL_DATABASE: ${names.databaseName}`, "MYSQL_USER: user", "MYSQL_PASSWORD: password", "MYSQL_ROOT_PASSWORD: root-password"]
        : [`MONGO_INITDB_ROOT_USERNAME: user`, "MONGO_INITDB_ROOT_PASSWORD: password"];
    const health = selection.database === "postgres"
      ? `test: ["CMD-SHELL", "pg_isready -U user -d ${names.databaseName}"]`
      : selection.database === "mysql" ? `test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]` : `test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]`;
    const dataPath = selection.database === "mongodb" ? "/data/db" : selection.database === "mysql" ? "/var/lib/mysql" : "/var/lib/postgresql/data";
    services.push([`${database.service}:`, `  image: ${database.image}`, "  restart: unless-stopped", "  environment:", ...env.map((line) => `    ${line}`), "  ports:", `    - "${database.port}:${database.port}"`, "  volumes:", `    - ${database.service}-data:${dataPath}`, "  healthcheck:", `    ${health}`].join("\n"));
    volumes.push(`  ${database.service}-data:`);
  }
  const broker = getOption(BROKERS, selection.broker);
  if (broker?.service === "rabbitmq") {
    services.push(["rabbitmq:", `  image: ${broker.image}`, "  restart: unless-stopped", "  environment:", `    RABBITMQ_DEFAULT_USER: user`, `    RABBITMQ_DEFAULT_PASS: password`, `    RABBITMQ_DEFAULT_VHOST: /${names.projectSlug}-local`, "  ports:", "    - \"5672:5672\"", "    - \"15672:15672\"", "  volumes:", "    - rabbitmq-data:/var/lib/rabbitmq"].join("\n"));
    volumes.push("  rabbitmq-data:");
  } else if (broker?.service === "kafka") {
    services.push(["kafka:", `  image: ${broker.image}`, "  restart: unless-stopped", "  ports:", "    - \"9092:9092\"", "  environment:", "    KAFKA_NODE_ID: 1", "    KAFKA_PROCESS_ROLES: broker,controller", "    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT", "    KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093", "    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092", "    KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER", "    KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093", "    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1", "    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1", "    KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1", "    KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0", "    KAFKA_NUM_PARTITIONS: 1", "  volumes:", "    - kafka-data:/var/lib/kafka/data"].join("\n"));
    volumes.push("  kafka-data:");
  } else if (broker?.service === "nats") {
    services.push(["nats:", `  image: ${broker.image}`, "  command: [\"-js\", \"-sd\", \"/data\", \"-m\", \"8222\"]", "  restart: unless-stopped", "  ports:", "    - \"4222:4222\"", "    - \"8222:8222\"", "  volumes:", "    - nats-data:/data"].join("\n"));
    volumes.push("  nats-data:");
  } else if (broker?.service === "redis") {
    services.push(["redis:", `  image: ${broker.image}`, "  restart: unless-stopped", "  ports:", "    - \"6379:6379\"", "  volumes:", "    - redis-data:/data"].join("\n"));
    volumes.push("  redis-data:");
  }
  const renderedServices = services.map((service) => service.split("\n").map((line) => "  " + line).join("\n")).join("\n\n");
  return [`name: ${names.projectSlug}`, "", "services:", renderedServices || "  # Nenhum serviço selecionado.", "", "volumes:", volumes.length ? volumes.join("\n") : "  {}", ""].join("\n");
}

async function writeGeneratedFiles(root, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content.endsWith("\n") ? content : `${content}\n`);
  }
}

function frontendPackage(selection) {
  const common = {
    name: "frontend",
    private: true,
    version: "0.1.0",
    type: "module",
    scripts: { test: "node --test", build: "echo 'build configured by the selected frontend stack'" },
  };
  if (selection.frontend === "nextjs") return { ...common, scripts: { dev: "next dev", build: "next build", start: "next start", test: "node --test" }, dependencies: { next: "^15.0.0", react: "^19.0.0", "react-dom": "^19.0.0", zod: "^3.0.0" }, devDependencies: { "@types/node": "^22.0.0", "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", typescript: "^5.0.0" } };
  if (selection.frontend === "vite-react") return { ...common, scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview", test: "node --test" }, dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" }, devDependencies: { "@types/react": "^19.0.0", "@types/react-dom": "^19.0.0", "@vitejs/plugin-react": "^4.3.0", typescript: "^5.0.0", vite: "^7.0.0" } };
  if (selection.frontend === "vite-vue") return { ...common, scripts: { dev: "vite", build: "vue-tsc -b && vite build", preview: "vite preview", test: "node --test" }, dependencies: { vue: "^3.5.0" }, devDependencies: { "@vitejs/plugin-vue": "^5.2.0", typescript: "^5.0.0", vite: "^7.0.0", "vue-tsc": "^2.2.0" } };
  if (selection.frontend === "angular") return { ...common, scripts: { start: "ng serve", build: "ng build", test: "node --test" }, dependencies: { "@angular/common": "^20.0.0", "@angular/compiler": "^20.0.0", "@angular/core": "^20.0.0", "@angular/platform-browser": "^20.0.0", rxjs: "^7.8.0", tslib: "^2.8.0", "zone.js": "^0.15.0" }, devDependencies: { "@angular-devkit/build-angular": "^20.0.0", "@angular/cli": "^20.0.0", "@angular/compiler-cli": "^20.0.0", typescript: "~5.8.0" } };
  return { ...common, scripts: { dev: "vite dev", build: "vite build", preview: "vite preview", test: "node --test" }, devDependencies: { "@sveltejs/adapter-auto": "^4.0.0", "@sveltejs/kit": "^2.0.0", "@sveltejs/vite-plugin-svelte": "^5.0.0", svelte: "^5.0.0", vite: "^7.0.0" } };
}

function frontendFiles(selection, names) {
  const packageJson = `${JSON.stringify(frontendPackage(selection), null, 2)}\n`;
  if (selection.frontend === "nextjs") return {
    "package.json": packageJson,
    "tsconfig.json": "{\n  \"compilerOptions\": {\n    \"target\": \"ES2017\",\n    \"lib\": [\"dom\", \"dom.iterable\", \"esnext\"],\n    \"strict\": true,\n    \"noEmit\": true,\n    \"module\": \"esnext\",\n    \"moduleResolution\": \"bundler\",\n    \"jsx\": \"preserve\",\n    \"incremental\": true,\n    \"plugins\": [{ \"name\": \"next\" }],\n    \"paths\": { \"@/*\": [\"./src/*\"] }\n  },\n  \"include\": [\"next-env.d.ts\", \"**/*.ts\", \"**/*.tsx\", \".next/types/**/*.ts\"],\n  \"exclude\": [\"node_modules\"]\n}\n",
    "next.config.ts": "import type { NextConfig } from 'next';\n\nconst nextConfig: NextConfig = {};\nexport default nextConfig;\n",
    "app/layout.tsx": `import type { Metadata } from 'next';\nimport './globals.css';\n\nexport const metadata: Metadata = { title: '${names.displayName}', description: 'Generated by Axiom Forge' };\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {\n  return <html lang=\"pt-BR\"><body>{children}</body></html>;\n}\n`,
    "app/page.tsx": "import { ExampleCard } from '@/src/features/example/components/example-card';\n\nexport default function HomePage() {\n  return <main><p className=\"eyebrow\">Axiom Forge starter</p><h1>Comece pelo problema, não pelo framework.</h1><ExampleCard /></main>;\n}\n",
    "app/globals.css": "* { box-sizing: border-box; }\nbody { margin: 0; background: #101114; color: #f4f4f5; font-family: system-ui, sans-serif; }\nmain { max-width: 760px; margin: 0 auto; padding: 12vh 24px; }\nh1 { max-width: 620px; font-size: clamp(2.5rem, 8vw, 5.5rem); line-height: .95; letter-spacing: -.06em; }\n.eyebrow { color: #a78bfa; text-transform: uppercase; letter-spacing: .16em; font-size: .75rem; }\n",
    "src/features/example/components/example-card.tsx": "export function ExampleCard() {\n  return <section><p>Esta feature é uma convenção neutra. Substitua-a por uma spec aprovada.</p></section>;\n}\n",
    "src/features/example/types.ts": "export type ExampleState = { status: 'empty' };\n",
    ".env.example": "NEXT_PUBLIC_API_ORIGIN=http://localhost:8080\n",
  };
  if (selection.frontend === "vite-react") return {
    "package.json": packageJson,
    "index.html": `<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/><title>${names.displayName}</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.tsx\"></script></body></html>`,
    "tsconfig.json": "{\n  \"files\": [],\n  \"references\": [{ \"path\": \"./tsconfig.app.json\" }]\n}\n",
    "tsconfig.app.json": "{\n  \"compilerOptions\": { \"target\": \"ES2020\", \"useDefineForClassFields\": true, \"lib\": [\"ES2020\", \"DOM\", \"DOM.Iterable\"], \"allowJs\": false, \"skipLibCheck\": true, \"esModuleInterop\": true, \"allowSyntheticDefaultImports\": true, \"strict\": true, \"module\": \"ESNext\", \"moduleResolution\": \"Bundler\", \"noEmit\": true, \"jsx\": \"react-jsx\" },\n  \"include\": [\"src\"]\n}\n",
    "vite.config.ts": "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n",
    "src/main.tsx": "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { App } from './app';\nimport './styles.css';\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);\n",
    "src/app.tsx": `import { ExampleCard } from './features/example/example-card';\nexport function App() { return <main><p className=\"eyebrow\">Axiom Forge starter</p><h1>${names.displayName}</h1><ExampleCard /></main>; }\n`,
    "src/features/example/example-card.tsx": "export function ExampleCard() { return <section><p>Feature neutra para substituir por uma spec aprovada.</p></section>; }\n",
    "src/styles.css": ":root { font-family: system-ui, sans-serif; color: #f4f4f5; background: #101114; }\nbody { margin: 0; }\nmain { max-width: 760px; margin: 0 auto; padding: 12vh 24px; }\nh1 { font-size: clamp(3rem, 9vw, 7rem); letter-spacing: -.07em; }\n.eyebrow { color: #a78bfa; text-transform: uppercase; letter-spacing: .16em; }\n",
    ".env.example": "VITE_API_ORIGIN=http://localhost:8080\n",
  };
  if (selection.frontend === "vite-vue") return {
    "package.json": packageJson,
    "index.html": `<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"UTF-8\"/><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/><title>${names.displayName}</title></head><body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.ts\"></script></body></html>`,
    "tsconfig.json": "{\n  \"files\": [],\n  \"references\": [{ \"path\": \"./tsconfig.app.json\" }]\n}\n",
    "tsconfig.app.json": "{\n  \"compilerOptions\": { \"target\": \"ES2020\", \"useDefineForClassFields\": true, \"module\": \"ESNext\", \"moduleResolution\": \"Bundler\", \"strict\": true, \"jsx\": \"preserve\", \"skipLibCheck\": true, \"noEmit\": true },\n  \"include\": [\"src/**/*.ts\", \"src/**/*.vue\"]\n}\n",
    "vite.config.ts": "import { defineConfig } from 'vite';\nimport vue from '@vitejs/plugin-vue';\nexport default defineConfig({ plugins: [vue()] });\n",
    "src/main.ts": "import { createApp } from 'vue';\nimport App from './App.vue';\nimport './styles.css';\ncreateApp(App).mount('#app');\n",
    "src/App.vue": `<script setup lang=\"ts\">\nimport ExampleCard from './features/example/ExampleCard.vue';\n</script>\n\n<template><main><p class=\"eyebrow\">Axiom Forge starter</p><h1>${names.displayName}</h1><ExampleCard /></main></template>\n`,
    "src/features/example/ExampleCard.vue": "<template><section><p>Feature neutra para substituir por uma spec aprovada.</p></section></template>\n",
    "src/styles.css": ":root { font-family: system-ui, sans-serif; color: #f4f4f5; background: #101114; }\nbody { margin: 0; }\nmain { max-width: 760px; margin: 0 auto; padding: 12vh 24px; }\nh1 { font-size: clamp(3rem, 9vw, 7rem); letter-spacing: -.07em; }\n.eyebrow { color: #a78bfa; text-transform: uppercase; letter-spacing: .16em; }\n",
    ".env.example": "VITE_API_ORIGIN=http://localhost:8080\n",
  };
  if (selection.frontend === "angular") return {
    "package.json": packageJson,
    "angular.json": `{"$schema":"./node_modules/@angular/cli/lib/config/schema.json","version":1,"projects":{"frontend":{"projectType":"application","root":"","sourceRoot":"src","prefix":"app","architect":{"build":{"builder":"@angular-devkit/build-angular:application","options":{"outputPath":"dist/frontend","browser":"src/main.ts","polyfills":["zone.js"],"tsConfig":"tsconfig.app.json","index":"src/index.html","assets":[],"styles":["src/styles.css"],"scripts":[]}},"serve":{"builder":"@angular-devkit/build-angular:dev-server","configurations":{"development":{"buildTarget":"frontend:build"}}}}}}}`,
    "tsconfig.json": "{\n  \"compileOnSave\": false,\n  \"compilerOptions\": { \"strict\": true, \"noImplicitOverride\": true, \"noPropertyAccessFromIndexSignature\": true, \"noImplicitReturns\": true, \"noFallthroughCasesInSwitch\": true, \"skipLibCheck\": true },\n  \"files\": [],\n  \"references\": [{ \"path\": \"./tsconfig.app.json\" }]\n}\n",
    "tsconfig.app.json": "{\n  \"extends\": \"./tsconfig.json\",\n  \"compilerOptions\": { \"outDir\": \"./out-tsc/app\", \"types\": [] },\n  \"files\": [\"src/main.ts\"],\n  \"include\": [\"src/**/*.d.ts\"]\n}\n",
    "src/index.html": `<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>${names.displayName}</title><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body><app-root></app-root></body></html>`,
    "src/main.ts": "import { bootstrapApplication } from '@angular/platform-browser';\nimport { AppComponent } from './app/app.component';\nbootstrapApplication(AppComponent).catch((error) => console.error(error));\n",
    "src/app/app.component.ts": `import { Component } from '@angular/core';\nimport { ExampleCardComponent } from './features/example/example-card.component';\n@Component({ selector: 'app-root', standalone: true, imports: [ExampleCardComponent], template: '<main><p class=\"eyebrow\">Axiom Forge starter</p><h1>${names.displayName}</h1><app-example-card /></main>' })\nexport class AppComponent { }\n`,
    "src/app/features/example/example-card.component.ts": "import { Component } from '@angular/core';\n@Component({ selector: 'app-example-card', standalone: true, template: '<section><p>Feature neutra para substituir por uma spec aprovada.</p></section>' })\nexport class ExampleCardComponent { }\n",
    "src/styles.css": ":root { font-family: system-ui, sans-serif; color: #f4f4f5; background: #101114; }\nbody { margin: 0; }\nmain { max-width: 760px; margin: 0 auto; padding: 12vh 24px; }\nh1 { font-size: clamp(3rem, 9vw, 7rem); letter-spacing: -.07em; }\n.eyebrow { color: #a78bfa; text-transform: uppercase; letter-spacing: .16em; }\n",
    ".env.example": "API_ORIGIN=http://localhost:8080\n",
  };
  return {
    "package.json": packageJson,
    "svelte.config.js": "import adapter from '@sveltejs/adapter-auto';\nexport default { kit: { adapter: adapter() } };\n",
    "vite.config.ts": "import { sveltekit } from '@sveltejs/kit/vite';\nimport { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [sveltekit()] });\n",
    "src/routes/+page.svelte": `<script lang=\"ts\">\nimport ExampleCard from '$lib/features/example/ExampleCard.svelte';\n</script>\n\n<svelte:head><title>${names.displayName}</title></svelte:head>\n<main><p class=\"eyebrow\">Axiom Forge starter</p><h1>${names.displayName}</h1><ExampleCard /></main>\n`,
    "src/lib/features/example/ExampleCard.svelte": "<section><p>Feature neutra para substituir por uma spec aprovada.</p></section>\n",
    "src/app.html": "<!doctype html><html lang=\"pt-BR\"><head>%sveltekit.head%</head><body data-sveltekit-preload-data=\"hover\">%sveltekit.body%</body></html>\n",
    "src/app.css": ":root { font-family: system-ui, sans-serif; color: #f4f4f5; background: #101114; }\nbody { margin: 0; }\nmain { max-width: 760px; margin: 0 auto; padding: 12vh 24px; }\nh1 { font-size: clamp(3rem, 9vw, 7rem); letter-spacing: -.07em; }\n.eyebrow { color: #a78bfa; text-transform: uppercase; letter-spacing: .16em; }\n",
    ".env.example": "PUBLIC_API_ORIGIN=http://localhost:8080\n",
  };
}

function backendPackage(selection) {
  const common = { name: "backend", private: true, version: "0.1.0", type: "module", scripts: { test: "node --test", build: "echo 'build configured by the selected backend stack'" } };
  if (selection.backend === "nestjs") return { ...common, scripts: { build: "nest build", start: "node dist/main.js", "start:dev": "nest start --watch", test: "node --test" }, dependencies: { "@nestjs/common": "^11.0.0", "@nestjs/core": "^11.0.0", "@nestjs/platform-express": "^11.0.0", "reflect-metadata": "^0.2.0", rxjs: "^7.8.0" }, devDependencies: { "@nestjs/cli": "^11.0.0", "@types/node": "^22.0.0", typescript: "^5.0.0" } };
  if (selection.backend === "express") return { ...common, scripts: { dev: "tsx watch src/main.ts", build: "tsc", start: "node dist/main.js", test: "node --test" }, dependencies: { express: "^5.1.0", zod: "^3.0.0" }, devDependencies: { "@types/express": "^5.0.0", "@types/node": "^22.0.0", tsx: "^4.0.0", typescript: "^5.0.0" } };
  return null;
}

function backendFiles(selection, names) {
  if (selection.backend === "nestjs") return {
    "package.json": `${JSON.stringify(backendPackage(selection), null, 2)}\n`,
    "tsconfig.json": "{\n  \"compilerOptions\": { \"module\": \"commonjs\", \"declaration\": true, \"removeComments\": true, \"emitDecoratorMetadata\": true, \"experimentalDecorators\": true, \"allowSyntheticDefaultImports\": true, \"target\": \"ES2021\", \"sourceMap\": true, \"outDir\": \"./dist\", \"baseUrl\": \"./\", \"incremental\": true, \"strict\": true, \"skipLibCheck\": true },\n  \"include\": [\"src/**/*.ts\"]\n}\n",
    "nest-cli.json": "{\n  \"collection\": \"@nestjs/schematics\",\n  \"sourceRoot\": \"src\"\n}\n",
    "src/main.ts": "import 'reflect-metadata';\nimport { NestFactory } from '@nestjs/core';\nimport { AppModule } from './app.module';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(Number(process.env.PORT ?? 8080));\n}\nbootstrap();\n",
    "src/app.module.ts": "import { Module, Controller, Get } from '@nestjs/common';\n\n@Controller('health')\nclass HealthController {\n  @Get()\n  getHealth() { return { status: 'ok' }; }\n}\n\n@Module({ controllers: [HealthController] })\nexport class AppModule {}\n",
    ".env.example": "PORT=8080\n",
  };
  if (selection.backend === "express") return {
    "package.json": `${JSON.stringify(backendPackage(selection), null, 2)}\n`,
    "tsconfig.json": "{\n  \"compilerOptions\": { \"target\": \"ES2022\", \"module\": \"NodeNext\", \"moduleResolution\": \"NodeNext\", \"strict\": true, \"outDir\": \"dist\", \"skipLibCheck\": true },\n  \"include\": [\"src\"]\n}\n",
    "src/domain/health/health.ts": "export type HealthStatus = { status: 'ok' };\nexport function getHealth(): HealthStatus { return { status: 'ok' }; }\n",
    "src/application/health/get-health.ts": "import { getHealth, type HealthStatus } from '../../domain/health/health.js';\nexport function getHealthStatus(): HealthStatus { return getHealth(); }\n",
    "src/interfaces/http/health-route.ts": "import { Router } from 'express';\nimport { getHealthStatus } from '../../application/health/get-health.js';\nexport const healthRouter = Router();\nhealthRouter.get('/health', (_request, response) => response.json(getHealthStatus()));\n",
    "src/main.ts": "import express from 'express';\nimport { healthRouter } from './interfaces/http/health-route.js';\nconst app = express();\napp.use(express.json());\napp.use(healthRouter);\napp.listen(Number(process.env.PORT ?? 8080), () => console.log('HTTP server listening'));\n",
    ".env.example": "PORT=8080\n",
  };
  if (selection.backend === "fastapi") return {
    "pyproject.toml": "[project]\nname = \"backend\"\nversion = \"0.1.0\"\ndependencies = [\"fastapi>=0.115,<1\", \"uvicorn[standard]>=0.30,<1\"]\n\n[project.optional-dependencies]\ndev = [\"pytest>=8,<9\"]\n\n[build-system]\nrequires = [\"setuptools>=68\"]\nbuild-backend = \"setuptools.build_meta\"\n",
    "app/__init__.py": "",
    "app/main.py": "from fastapi import FastAPI\nfrom app.routers.health import router as health_router\n\napp = FastAPI(title='Axiom Forge API')\napp.include_router(health_router)\n",
    "app/routers/__init__.py": "",
    "app/routers/health.py": "from fastapi import APIRouter\n\nrouter = APIRouter(prefix='/health', tags=['health'])\n\n@router.get('')\ndef health() -> dict[str, str]:\n    return {'status': 'ok'}\n",
    "tests/test_health.py": "from app.main import app\n\ndef test_app_has_health_route() -> None:\n    assert any(route.path == '/health' for route in app.routes)\n",
    ".env.example": "PORT=8080\n",
  };
  if (selection.backend === "go-gin") return {
    "go.mod": "module example.com/backend\n\ngo 1.23\n\nrequire github.com/gin-gonic/gin v1.10.0\n",
    "cmd/api/main.go": "package main\n\nimport (\n  \"net/http\"\n  \"github.com/gin-gonic/gin\"\n)\n\nfunc main() {\n  router := gin.New()\n  router.GET(\"/health\", func(context *gin.Context) { context.JSON(http.StatusOK, gin.H{\"status\": \"ok\"}) })\n  _ = router.Run(\":8080\")\n}\n",
    "internal/health/health.go": "package health\n\ntype Status struct { Status string `json:\"status\"` }\nfunc Check() Status { return Status{Status: \"ok\"} }\n",
    ".env.example": "PORT=8080\n",
  };
  if (selection.backend === "spring-boot") return {
    "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd\"><modelVersion>4.0.0</modelVersion><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.5.5</version></parent><groupId>example</groupId><artifactId>backend</artifactId><version>0.1.0</version><properties><java.version>21</java.version></properties><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency></dependencies><build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build></project>\n",
    "src/main/java/com/example/backend/BackendApplication.java": "package com.example.backend;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\n\n@SpringBootApplication\npublic class BackendApplication {\n  public static void main(String[] args) { SpringApplication.run(BackendApplication.class, args); }\n}\n",
    "src/main/java/com/example/backend/HealthController.java": "package com.example.backend;\n\nimport java.util.Map;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class HealthController {\n  @GetMapping(\"/health\")\n  Map<String, String> health() { return Map.of(\"status\", \"ok\"); }\n}\n",
    ".env.example": "SERVER_PORT=8080\n",
  };
  return {
    "backend.csproj": "<Project Sdk=\"Microsoft.NET.Sdk.Web\"><PropertyGroup><TargetFramework>net8.0</TargetFramework><Nullable>enable</Nullable><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>\n",
    "Program.cs": "var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\napp.MapGet(\"/health\", () => Results.Ok(new { status = \"ok\" }));\napp.Run();\n",
    ".env.example": "ASPNETCORE_URLS=http://localhost:8080\n",
  };
}

function optionLabel(options, value) {
  return value ? getOption(options, value)?.label ?? value : "não selecionado";
}

function selectedReadme(selection, names, agentTooling) {
  const rows = [
    ["Escopo", optionLabel(PROJECT_MODES, selection.mode)],
    ["Frontend", optionLabel(FRONTEND_STACKS, selection.frontend)],
    ["Backend", optionLabel(BACKEND_STACKS, selection.backend)],
    ["System design frontend", optionLabel(FRONTEND_DESIGNS, selection.frontendDesign)],
    ["System design backend", optionLabel(BACKEND_DESIGNS, selection.backendDesign)],
    ["Arquitetura", optionLabel(ARCHITECTURES, selection.architecture)],
    ["Banco", optionLabel(DATABASES, selection.database)],
    ["Broker", optionLabel(BROKERS, selection.broker)],
    ["Provider alvo", optionLabel(PROVIDERS, selection.provider)],
    ["Autenticação", optionLabel(AUTH_TEMPLATES, selection.auth)],
    ["Agentes", agentTooling],
  ];
  return [
    "---", "name: " + names.projectSlug,
    "description: Projeto derivado do Axiom Forge com perfil de stack selecionável.",
    "alwaysApply: false", "---", "",
    "# " + names.displayName, "",
    "> Um projeto começa como uma hipótese. O Axiom Forge coloca uma forja inteira ao redor dela: especificação, agentes, runtime e gates.",
    "", "## Perfil escolhido", "", "| Eixo | Escolha |", "| --- | --- |",
    ...rows.map((row) => "| " + row[0] + " | " + row[1] + " |"),
    "", "O catálogo filtra designs incompatíveis com a stack. Em especial, uma seleção Event-Driven exige um broker real no Compose. O arquivo docs/architecture/selected-stack.md é a referência operacional deste perfil.",
    "", "## Como iniciar", "",
    "1. Copie os exemplos de ambiente: cp .env.example .env e complete somente os valores necessários.",
    "2. Instale as dependências dentro de cada app selecionado.",
    "3. Suba a infraestrutura local com docker compose up -d quando docker-compose.yml existir.",
    "4. Rode o comando de desenvolvimento descrito no README de cada app.",
    "5. Abra uma task com /kickoff e escolha discovery com hipóteses conhecidas ou pesquisa assistida.",
    "", "## Arquitetura como animal", "",
    "Pense neste repositório como um animal com órgãos intercambiáveis: o sistema nervoso é o SDD e o Gitflow; o esqueleto é o system design; os músculos são frontend/backend; o estômago é o banco; o sistema circulatório é o broker; e o habitat é o provider. O catálogo troca os órgãos sem apagar o sistema nervoso.",
    "", "## Regras que não mudam", "",
    "- Nenhuma regra de negócio acompanha o scaffold.",
    "- Só uma spec APPROVED/approved autoriza comportamento de produto.",
    "- Domínio não importa framework, I/O, SDK, logger ou relógio global.",
    "- Contratos externos validam unknown; segredos ficam apenas no ambiente.",
    "- Gitflow, gates, segurança, rastreabilidade e camada agentic continuam presentes.",
    "", "## Agentes", "",
    "O roster de processo fica em .agents/ para Codex e/ou .claude/ para Claude. Agentes especialistas selecionados aparecem em .agents/skills/ e .claude/agents/; eles orientam a stack e não substituem a aprovação de produto.",
    "", "## Próximo passo", "",
    "Leia docs/architecture/selected-stack.md, configure os secrets de .env.example e execute /kickoff.", "",
  ].join("\n");
}

function guidanceFiles(selection, names) {
  const specialistPaths = specialistIds(selection).join(", ") || "nenhum especialista de runtime";
  const common = [
    "# " + names.displayName,
    "",
    "Este projeto foi gerado pelo Axiom Forge. Ele é um scaffold neutro: não contém domínio, personas, pricing, tenancy ou regra de negócio.",
    "",
    "## Perfil",
    "",
    "- Escopo: " + selection.mode,
    "- Frontend: " + (selection.frontend ?? "none") + " (" + (selection.frontendDesign ?? "none") + ")",
    "- Backend: " + (selection.backend ?? "none") + " (" + (selection.backendDesign ?? "none") + ")",
    "- Arquitetura: " + selection.architecture,
    "- Dados: " + selection.database,
    "- Mensageria: " + selection.broker,
    "- Provider: " + selection.provider,
    "- Especialistas instalados: " + specialistPaths,
    "",
    "## Contrato de trabalho",
    "",
    "Leia docs/STATE.md, docs/architecture/selected-stack.md, a spec ligada à task e o método da camada antes de agir. Siga o fluxo SPEC → spec → domain → tech-lead → lanes → testes → quality/security → release → Git.",
    "",
    "Comportamento de produto só pode ser implementado com spec APPROVED/approved. Ambiguidade que muda produto vira OPEN-REQ; divergência consciente vira SPEC_DEVIATION; decisão difícil de reverter vira ADR.",
    "",
    "Preserve a arquitetura selecionada, mantenha o domínio independente de frameworks e valide qualquer entrada externa. Não adicione dependência sem aprovação, não use secrets reais, casts ou any para esconder contratos.",
  ].join("\n");
  return {
    "AGENTS.md": common + "\n\n## Camadas\n\nO runtime gerado é intencionalmente mínimo e neutro. Expanda somente por specs aprovadas.\n",
    "CLAUDE.md": ["---", "name: project-instructions", "description: Contrato de execução do projeto derivado.", "alwaysApply: true", "---", "", common, ""].join("\n"),
    "docs/STATE.md": ["---", "name: project-state", "description: Estado vivo do projeto derivado.", "alwaysApply: false", "---", "", "# Estado do projeto", "", "- **Status:** scaffold neutro gerado pelo Axiom Forge.", "- **Perfil:** " + selection.mode + " / " + (selection.frontend ?? "none") + " / " + (selection.backend ?? "none") + ".", "- **Próximo passo:** execute /kickoff e registre a primeira spec.", "- **Regra:** nenhum domínio acompanha este repositório.", ""].join("\n"),
    "docs/engineering/README.md": ["---", "name: engineering-method", "description: Índice da engenharia operacional do projeto.", "alwaysApply: false", "---", "", "# Engenharia", "", "Este diretório mantém os contratos duráveis de SDD, qualidade, segurança, testes e Gitflow. A escolha de runtime está em docs/architecture/selected-stack.md.", "", "O Axiom Forge separa o processo invariável da implementação variável: o catálogo pode mudar linguagem, framework, pastas, banco, broker e provider sem remover rastreabilidade ou gates.", ""].join("\n"),
    "docs/architecture/selected-stack.md": [
      "---", "name: selected-stack", "description: Perfil de stack, arquitetura e infraestrutura escolhido na geração.", "alwaysApply: false", "---", "",
      "# Perfil de stack selecionado", "", "| Eixo | Valor |", "| --- | --- |",
      "| Modo | " + selection.mode + " |", "| Frontend | " + (selection.frontend ?? "none") + " |", "| Design frontend | " + (selection.frontendDesign ?? "none") + " |",
      "| Backend | " + (selection.backend ?? "none") + " |", "| Design backend | " + (selection.backendDesign ?? "none") + " |",
      "| Arquitetura | " + selection.architecture + " |", "| Banco | " + selection.database + " |", "| Broker | " + selection.broker + " |",
      "| Provider | " + selection.provider + " |", "| Auth | " + selection.auth + " |",
      "", "## Decisões operacionais", "",
      "- O catálogo gerou somente as camadas selecionadas.",
      "- A arquitetura " + selection.architecture + " é uma orientação inicial; registre decisões específicas em ADRs.",
      "- A seleção Event-Driven requer o serviço de broker no Compose.",
      "- O serviço local usa imagens públicas e gratuitas para desenvolvimento; disponibilidade, segurança e HA de produção exigem desenho próprio.",
      "- O provider é alvo de implantação, não provisionamento automático nem autorização para gravar credenciais.",
      "", "Consulte o catálogo e as fontes em docs/engineering/stack-library/README.md", "",
    ].join("\n"),
  };
}

async function removeGeneratedScaffold(targetDirectory) {
  const paths = [
    "frontend", "backend", ".env.example", "README.md", "AGENTS.md", "CLAUDE.md",
    "docs/STATE.md", "docs/architecture/overview.md", "docs/engineering/README.md",
    "docs/engineering/frontend-engineering-method.md", "docs/engineering/backend-engineering-method.md",
    "docs/engineering/frontend", "docs/engineering/backend",
    ".github/workflows/apps.yml", "docker-compose.yml",
  ];
  await Promise.all(paths.map((path) => rm(join(targetDirectory, path), { recursive: true, force: true })));
}

function architectureFiles(selection) {
  if (selection.architecture === "microservices") return {
    "services/README.md": [
      "# Service boundaries", "",
      "Este diretório marca o ponto de expansão para serviços independentes. O scaffold começa com um único backend para evitar uma frota fictícia.",
      "Registre owner, contrato, dados, comunicação e motivo operacional antes de extrair outro serviço.",
    ].join("\n"),
  };
  if (selection.architecture === "serverless") return {
    "functions/README.md": [
      "# Function boundaries", "",
      "Este diretório marca funções/event handlers do provider selecionado. O scaffold começa com um health check portátil; limites de timeout, retry, cold start, bindings e observabilidade devem ser decididos em ADR.",
    ].join("\n"),
  };
  if (selection.architecture === "event-driven") return {
    "messaging/README.md": [
      "# Messaging boundary", "",
      "O broker escolhido é infraestrutura de desenvolvimento. Defina owners, versionamento, routing/particionamento, acknowledgement, retry, DLQ e idempotência antes de criar eventos de produto.",
    ].join("\n"),
  };
  return {
    "modules/README.md": [
      "# Module boundary", "",
      "Organize capacidades em módulos explícitos. Não adicione regra de negócio aqui antes de uma spec APPROVED.",
    ].join("\n"),
  };
}

function runtimeGuidanceFiles(selection) {
  const files = {};
  if (selection.frontend) {
    const stack = getOption(FRONTEND_STACKS, selection.frontend);
    const specialist = SPECIALIST_LIBRARY[stack.specialist];
    files["docs/engineering/frontend-engineering-method.md"] = [
      "---", "name: frontend-engineering-method", "description: Método do frontend selecionado para o projeto derivado.", "alwaysApply: false", "---", "",
      "# Método frontend — " + stack.label, "",
      "Leia o perfil selecionado antes de editar. Este runtime não possui domínio de produto.", "",
      "## Convenção", "",
      "Stack: " + stack.label + ". System design: " + selection.frontendDesign + ". Foco: " + specialist.focus + ".", "",
      "- contracts/schemas validam entradas externas antes de virar estado interno.",
      "- services e adapters cuidam de transporte; componentes visuais não fazem fetch nem decidem domínio.",
      "- mantenha a convenção própria da stack e registre divergências em ADR.",
      "- use o comando real de " + stack.commands.test + " e " + stack.commands.build + " no gate.",
      "", "## Regras do especialista", "", ...specialist.rules.map((rule) => "- " + rule), "",
      "Uma spec APPROVED/approved é necessária antes de criar comportamento de produto.",
    ].join("\n");
    files["docs/engineering/frontend/README.md"] = [
      "---", "name: frontend-library", "description: Biblioteca do frontend selecionado.", "alwaysApply: false", "---", "",
      "# Frontend", "", "Runtime: " + stack.label, "Design: " + selection.frontendDesign,
      "", "Leia docs/engineering/frontend-engineering-method.md e preserve as fronteiras de contratos, serviços, orquestração e UI.", "",
    ].join("\n");
  }
  if (selection.backend) {
    const stack = getOption(BACKEND_STACKS, selection.backend);
    const specialist = SPECIALIST_LIBRARY[stack.specialist];
    files["docs/engineering/backend-engineering-method.md"] = [
      "---", "name: backend-engineering-method", "description: Método do backend selecionado para o projeto derivado.", "alwaysApply: false", "---", "",
      "# Método backend — " + stack.label, "",
      "Leia o perfil selecionado antes de editar. Este runtime não possui domínio de produto.", "",
      "## Convenção", "",
      "Stack: " + stack.label + ". System design: " + selection.backendDesign + ". Foco: " + specialist.focus + ".", "",
      "- valide request e config na fronteira; não aceite unknown silenciosamente.",
      "- mantenha domínio/application independentes de framework, I/O, SDK e relógio global.",
      "- repositories, brokers e providers implementam ports explícitas.",
      "- use o comando real de " + stack.commands.test + " e " + stack.commands.build + " no gate.",
      "", "## Regras do especialista", "", ...specialist.rules.map((rule) => "- " + rule), "",
      "Uma spec APPROVED/approved é necessária antes de criar comportamento de produto.",
    ].join("\n");
    files["docs/engineering/backend/README.md"] = [
      "---", "name: backend-library", "description: Biblioteca do backend selecionado.", "alwaysApply: false", "---", "",
      "# Backend", "", "Runtime: " + stack.label, "Design: " + selection.backendDesign,
      "", "Leia docs/engineering/backend-engineering-method.md e preserve as fronteiras entre interfaces, aplicação, domínio e infraestrutura quando aplicável.", "",
    ].join("\n");
  }
  return files;
}

function ciJob(id, workingDirectory, setupLines, installCommand, buildCommand, testCommand) {
  return [
    "  " + id + ":",
    "    runs-on: ubuntu-latest",
    "    defaults:",
    "      run:",
    "        working-directory: " + workingDirectory,
    "    steps:",
    "      - uses: actions/checkout@v4",
    ...setupLines.map((line) => "      " + line),
    "      - run: " + installCommand,
    "      - run: " + buildCommand,
    "      - run: " + testCommand,
  ].join("\n");
}

function ciWorkflow(selection) {
  const jobs = [];
  if (selection.frontend) {
    const setup = selection.frontend === "angular"
      ? ["- uses: actions/setup-node@v4", "  with:", "    node-version: 22"]
      : ["- uses: actions/setup-node@v4", "  with:", "    node-version: 22"];
    jobs.push(ciJob("frontend", "frontend", setup, "npm install --no-audit --no-fund", "npm run build", "npm run test"));
  }
  if (selection.backend) {
    if (selection.backend === "fastapi") jobs.push(ciJob("backend", "backend", ["- uses: actions/setup-python@v5", "  with:", "    python-version: '3.12'"], "python -m pip install -e '.[dev]'", "python -m compileall app", "python -m pytest"));
    else if (selection.backend === "go-gin") jobs.push(ciJob("backend", "backend", ["- uses: actions/setup-go@v5", "  with:", "    go-version: '1.23'"], "go mod download", "go build ./...", "go test ./..."));
    else if (selection.backend === "spring-boot") jobs.push(ciJob("backend", "backend", ["- uses: actions/setup-java@v4", "  with:", "    distribution: temurin", "    java-version: '21'", "    cache: maven"], "mvn dependency:go-offline", "mvn package -DskipTests", "mvn test"));
    else if (selection.backend === "aspnet-core") jobs.push(ciJob("backend", "backend", ["- uses: actions/setup-dotnet@v4", "  with:", "    dotnet-version: '8.0.x'"], "dotnet restore", "dotnet build --no-restore", "dotnet test --no-build"));
    else jobs.push(ciJob("backend", "backend", ["- uses: actions/setup-node@v4", "  with:", "    node-version: 22"], "npm install --no-audit --no-fund", "npm run build", "npm run test"));
  }
  return [
    "name: apps", "",
    "on:", "  pull_request:", "  push:", "    branches: [main]", "",
    "jobs:", jobs.join("\n\n"), "",
  ].join("\n");
}

async function adaptLegacyReadme(targetDirectory, agentTooling) {
  const readmePath = join(targetDirectory, "README.md");
  let readme = await readFile(readmePath, "utf8");
  readme = readme.replace(/\n## Criar um projeto derivado\n[\s\S]*?\n## Segurança\n/, "\n## Segurança\n");
  if (agentTooling === "claude") {
    readme = readme.replace(".agents/    roster técnico cross-squad e skills do orquestrador", ".claude/    agentes Claude, regras, hooks e skills do orquestrador");
    readme = readme.replace(".claude/    agentes Claude, regras e hooks compartilhados\n", "");
    readme = readme.replace("python3 .agents/scripts/validate-agent-parity.py\n", "");
  } else {
    readme = readme.replace(".agents/    roster técnico cross-squad e skills do orquestrador\n", "");
    readme = readme.replace(".claude/    agentes Claude, regras e hooks compartilhados", ".agents/    roster Codex cross-squad e skills do orquestrador");
  }
  await writeFile(readmePath, readme);
  for (const relativePath of ["docs/engineering/README.md", "product/README.md"]) {
    const path = join(targetDirectory, relativePath);
    let content = await readFile(path, "utf8");
    const rootPrefix = relativePath === "docs/engineering/README.md" ? "../../" : "../";
    const sourceLink = rootPrefix + ".agents/skills/kickoff/SKILL.md";
    const selectedLink = rootPrefix + (agentTooling === "claude" ? ".claude" : ".agents") + "/skills/kickoff/SKILL.md";
    content = content.replaceAll(sourceLink, selectedLink);
    await writeFile(path, content);
  }
}

async function writeStackProfile(targetDirectory, names, agentTooling, selection) {
  await mkdir(join(targetDirectory, ".axiom"), { recursive: true });
  await writeJson(join(targetDirectory, ".axiom", "stack-profile.json"), {
    catalogVersion: CATALOG_VERSION,
    project: names.displayName,
    slug: names.projectSlug,
    mode: selection.mode,
    frontend: selection.frontend,
    frontendDesign: selection.frontendDesign,
    backend: selection.backend,
    backendDesign: selection.backendDesign,
    architecture: selection.architecture,
    database: selection.database,
    broker: selection.broker,
    provider: selection.provider,
    auth: selection.auth,
    agentTooling,
    specialists: specialistIds(selection),
  });
}

async function generateCustomProject(targetDirectory, names, agentTooling, selection) {
  await removeGeneratedScaffold(targetDirectory);
  await writeGeneratedFiles(targetDirectory, {
    "README.md": selectedReadme(selection, names, agentTooling),
    ...guidanceFiles(selection, names),
    ...runtimeGuidanceFiles(selection),
  });
  if (selection.frontend) {
    await writeGeneratedFiles(join(targetDirectory, "frontend"), frontendFiles(selection, names));
    await writeGeneratedFiles(join(targetDirectory, "frontend"), {
      "README.md": [
        "# Frontend", "",
        "Stack: " + optionLabel(FRONTEND_STACKS, selection.frontend),
        "System design: " + optionLabel(FRONTEND_DESIGNS, selection.frontendDesign),
        "", "Instale as dependências e execute o comando indicado no catálogo. Esta camada começa apenas com uma composição visual neutra.",
      ].join("\n"),
    });
  }
  if (selection.backend) {
    await writeGeneratedFiles(join(targetDirectory, "backend"), backendFiles(selection, names));
    await writeGeneratedFiles(join(targetDirectory, "backend"), architectureFiles(selection));
    await writeGeneratedFiles(join(targetDirectory, "backend"), {
      "README.md": [
        "# Backend", "",
        "Stack: " + optionLabel(BACKEND_STACKS, selection.backend),
        "System design: " + optionLabel(BACKEND_DESIGNS, selection.backendDesign),
        "", "O endpoint /health é somente um smoke check técnico. Não há regra de negócio neste scaffold.",
      ].join("\n"),
    });
  }
  if (selection.database !== "none" || selection.broker !== "none") {
    await writeFile(join(targetDirectory, "docker-compose.yml"), composeText(selection, names));
  }
  if (selection.frontend || selection.backend) {
    await writeGeneratedFiles(targetDirectory, { ".github/workflows/apps.yml": ciWorkflow(selection) });
  }
  await writeFile(join(targetDirectory, ".env.example"), rootEnvText(selection, names));
  await writeStackProfile(targetDirectory, names, agentTooling, selection);
  await installAgentTooling(targetDirectory, agentTooling, selection);
}

async function generateAuthProject(targetDirectory, names, agentTooling, selection) {
  await renderTemplate(targetDirectory, names);
  await adaptLegacyReadme(targetDirectory, agentTooling);
  await writeStackProfile(targetDirectory, names, agentTooling, selection);
  await installAgentTooling(targetDirectory, agentTooling, selection);
}

async function writeProjectConfig(targetDirectory, names, agentTooling, selection) {
  await writeJson(join(targetDirectory, ".project-config.json"), {
    name: names.displayName,
    slug: names.projectSlug,
    databaseName: names.databaseName,
    composeProjectName: names.projectSlug,
    rabbitVhost: selection.broker === "rabbitmq" ? "/" + names.projectSlug + "-local" : null,
    rabbitExchange: selection.broker === "rabbitmq" ? names.projectSlug + ".events" : null,
    agentTooling,
    generatedBy: "create-axiom-forge",
    catalogVersion: CATALOG_VERSION,
    selection,
  });
}

async function askChoice(prompt, title, options) {
  output.write("\n" + title + "\n");
  options.forEach((option, index) => output.write("  " + (index + 1) + ") " + option.label + " — " + option.description + "\n"));
  while (true) {
    const answer = await prompt.question("Escolha [1-" + options.length + "]: ");
    const option = options[Number(answer) - 1];
    if (option) return option.value;
    output.write("Escolha uma opção válida.\n");
  }
}

async function askSelection(prompt, partial = {}) {
  const nonInteractive = partial.yes === true;
  const agentTooling = partial.agentTooling ?? (nonInteractive ? "both" : await askChoice(prompt, "Quais agentes instalar?", AGENT_OPTIONS));
  const mode = partial.mode ?? (nonInteractive ? "full" : await askChoice(prompt, "Qual escopo gerar?", PROJECT_MODES));
  const frontend = mode === "backend" ? null : partial.frontend ?? (nonInteractive ? "nextjs" : await askChoice(prompt, "Qual stack de frontend?", FRONTEND_STACKS));
  const backend = mode === "frontend" ? null : partial.backend ?? (nonInteractive ? "nestjs" : await askChoice(prompt, "Qual stack de backend?", BACKEND_STACKS));
  const frontendDesign = frontend ? partial.frontendDesign ?? (nonInteractive ? getOption(FRONTEND_STACKS, frontend).systemDesigns[0] : await askChoice(prompt, "Qual system design de frontend?", stackDesignOptions(FRONTEND_DESIGNS, getOption(FRONTEND_STACKS, frontend)))) : null;
  const backendDesign = backend ? partial.backendDesign ?? (nonInteractive ? getOption(BACKEND_STACKS, backend).systemDesigns[0] : await askChoice(prompt, "Qual system design de backend?", stackDesignOptions(BACKEND_DESIGNS, getOption(BACKEND_STACKS, backend)))) : null;
  const architectureOptions = mode === "frontend" ? ARCHITECTURES.filter((option) => !option.requiresBroker) : ARCHITECTURES;
  const architecture = partial.architecture ?? (nonInteractive ? "modular-monolith" : await askChoice(prompt, "Qual arquitetura?", architectureOptions));
  const database = mode === "frontend" ? "none" : partial.database ?? (nonInteractive ? "none" : await askChoice(prompt, "Qual banco?", DATABASES));
  const brokerOptions = architecture === "event-driven" ? BROKERS.filter((option) => option.value !== "none") : BROKERS;
  const broker = mode === "frontend" ? "none" : partial.broker ?? (nonInteractive ? (architecture === "event-driven" ? "rabbitmq" : "none") : await askChoice(prompt, "Qual broker?", brokerOptions));
  const providerOptions = mode === "backend" ? PROVIDERS.filter((option) => !option.frontendOnly) : PROVIDERS;
  const provider = partial.provider ?? (nonInteractive ? "local" : await askChoice(prompt, "Qual provider alvo?", providerOptions));
  const compatible = compatibleAuth("axiom-foundation", { mode, frontend, backend, database, broker, provider });
  const authOptions = compatible ? AUTH_TEMPLATES : [AUTH_TEMPLATES[0]];
  const auth = partial.auth ?? (nonInteractive ? "none" : await askChoice(prompt, "Deseja um template de autenticação?", authOptions));
  if (!compatible && auth !== "none") output.write("\n  Autenticação pronta indisponível para este perfil; seguindo com projeto neutro.\n");
  return { agentTooling, mode, frontend, backend, frontendDesign, backendDesign, architecture, database, broker, provider, auth };
}

export function helpText() {
  return [
    "Uso: npx create-axiom-forge <nome-do-projeto>",
    "     npm create axiom-forge -- <nome-do-projeto>",
    "",
    "Sem flags, o CLI pergunta o escopo, stacks, designs, arquitetura, banco, broker, provider, auth e agentes.",
    "",
    "Opções:",
    "  --agents claude|codex|both   seleciona os agentes",
    "  --mode full|frontend|backend define as camadas",
    "  --frontend <id>              nextjs, vite-react, vite-vue, angular, sveltekit",
    "  --frontend-design <id>       design compatível com a stack",
    "  --backend <id>               nestjs, express, fastapi, go-gin, spring-boot, aspnet-core",
    "  --backend-design <id>        design compatível com a stack",
    "  --architecture <id>          modular-monolith, layered-monolith, microservices, event-driven, serverless",
    "  --database <id>              none, postgres, mysql, mongodb, sqlite",
    "  --broker <id>                none, rabbitmq, kafka, nats, redis-streams",
    "  --provider <id>              local, aws, azure, gcp, vercel, cloudflare",
    "  --auth none|axiom-foundation template técnico opcional de autenticação",
    "  --catalog                    mostra todo o catálogo de escolhas",
    "  --path <diretório>           define o diretório pai de saída",
    "  -y, --yes                    reservado para scripts; mantém o fluxo não destrutivo",
    "  -h, --help                   mostra esta ajuda",
    "",
    "Depois da criação, entre no diretório e execute /kickoff.",
  ].join("\n");
}

function catalogText() {
  const section = (title, options) => [
    "\n" + title,
    ...options.map((option) => {
      const compatibility = option.stacks ? " [" + option.stacks.join(", ") + "]" : "";
      return "  " + option.value + " — " + option.label + compatibility + ": " + option.description;
    }),
  ].join("\n");
  return [
    "Axiom Forge catalog " + CATALOG_VERSION,
    section("Escopo", PROJECT_MODES),
    section("Frontend", FRONTEND_STACKS),
    section("Frontend designs", FRONTEND_DESIGNS),
    section("Backend", BACKEND_STACKS),
    section("Backend designs", BACKEND_DESIGNS),
    section("Arquiteturas", ARCHITECTURES),
    section("Bancos", DATABASES),
    section("Brokers", BROKERS),
    section("Providers", PROVIDERS),
    section("Autenticação", AUTH_TEMPLATES),
  ].join("\n");
}

export async function createProject({ projectName, agentTooling, destination = process.cwd(), ...inputSelection }) {
  const names = deriveProjectNames(projectName);
  assertAgentTooling(agentTooling);
  const selection = resolveSelection(inputSelection);
  const targetDirectory = resolve(destination, names.projectSlug);
  await mkdir(dirname(targetDirectory), { recursive: true });
  await mkdir(targetDirectory, { recursive: false });
  await cp(TEMPLATE_ROOT, targetDirectory, { recursive: true });
  if (selection.auth !== "none") await generateAuthProject(targetDirectory, names, agentTooling, selection);
  else await generateCustomProject(targetDirectory, names, agentTooling, selection);
  await writeProjectConfig(targetDirectory, names, agentTooling, selection);
  return Object.freeze({ ...names, agentTooling, selection, targetDirectory });
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    output.write(helpText() + "\n");
    return;
  }
  if (parsed.catalog) {
    output.write(catalogText() + "\n");
    return;
  }
  if (parsed.projectName === undefined) {
    throw new Error("Informe o nome do projeto. Exemplo: npx create-axiom-forge meu-projeto");
  }
  const prompt = createInterface({ input, output });
  try {
    const selectionInput = { ...parsed };
    delete selectionInput.projectName;
    delete selectionInput.destination;
    delete selectionInput.agentTooling;
    const asked = await askSelection(prompt, { ...selectionInput, agentTooling: parsed.agentTooling });
    const result = await createProject({ projectName: parsed.projectName, destination: parsed.destination, ...asked });
    output.write("\n✓ Projeto criado em " + result.targetDirectory + "\n");
    output.write("  Perfil: " + result.selection.mode + " / " + (result.selection.frontend ?? "sem frontend") + " / " + (result.selection.backend ?? "sem backend") + "\n");
    output.write("  Infra: " + result.selection.database + " + " + result.selection.broker + "\n");
    output.write("  Agentes: " + result.agentTooling + "\n");
    output.write("\nPróximos passos:\n");
    output.write("  cd " + (relative(process.cwd(), result.targetDirectory) || ".") + "\n");
    output.write("  /kickoff\n");
  } finally {
    prompt.close();
  }
}

function isEntrypoint() {
  if (process.argv[1] === undefined) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntrypoint()) main().catch((error) => {
  output.write("\n✗ " + (error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
