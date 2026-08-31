#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = join(PACKAGE_ROOT, "template");

export const AGENT_OPTIONS = Object.freeze([
  { value: "claude", label: "Claude", description: "instala skills e agentes Claude" },
  { value: "codex", label: "Codex", description: "instala skills e instruções Codex" },
  { value: "both", label: "Claude + Codex", description: "instala os dois conjuntos" },
]);

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

export function parseArguments(argv) {
  let projectName;
  let agentTooling;
  let destination;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--agents" || argument === "-a") {
      agentTooling = argv[++index];
      continue;
    }
    if (argument.startsWith("--agents=")) {
      agentTooling = argument.slice("--agents=".length);
      continue;
    }
    if (argument === "--path") {
      destination = argv[++index];
      continue;
    }
    if (argument.startsWith("--path=")) {
      destination = argument.slice("--path=".length);
      continue;
    }
    if (argument === "--help" || argument === "-h") return Object.freeze({ help: true });
    if (argument.startsWith("-")) throw new Error(`Opção desconhecida: ${argument}`);
    if (projectName !== undefined) throw new Error("Informe somente um nome de projeto.");
    projectName = argument;
  }
  if (agentTooling !== undefined && !AGENT_OPTIONS.some((option) => option.value === agentTooling)) {
    throw new Error("--agents deve ser claude, codex ou both.");
  }
  return Object.freeze({ projectName, agentTooling, destination });
}

function assertAgentTooling(agentTooling) {
  if (!AGENT_OPTIONS.some((option) => option.value === agentTooling)) {
    throw new Error("Escolha de agentes inválida. Use claude, codex ou both.");
  }
}

export function transformTemplateText(content, filePath, names) {
  let result = content;
  for (const [search, replacement] of [
    ["Axiom Forge", names.displayName],
    ["axiom-forge", names.projectSlug],
    ["axiom-forge-home", `${names.projectSlug}-home`],
    ["Starter App", names.displayName],
    ["starterapp", names.appIdentifier],
  ]) {
    result = result.split(search).join(replacement);
  }

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
  if (filePath === ".github/workflows/apps.yml") {
    result = result.split("application_ci").join(`${names.databaseName}_ci`);
  }
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
  const files = await listFiles(targetDirectory);
  for (const file of files) {
    const buffer = await readFile(file.path);
    if (buffer.includes(0)) continue;
    const rendered = transformTemplateText(buffer.toString("utf8"), file.relativePath, names);
    if (rendered !== buffer.toString("utf8")) await writeFile(file.path, rendered);
  }
}

async function installAgentTooling(targetDirectory, agentTooling) {
  assertAgentTooling(agentTooling);
  if (agentTooling === "both") return;
  const removeCodex = agentTooling === "claude";
  const directoryName = removeCodex ? ".agents" : ".claude";
  const instructionName = removeCodex ? "AGENTS.md" : "CLAUDE.md";
  const paths = [
    directoryName,
    `backend/${directoryName}`,
    `frontend/${directoryName}`,
    `product/${directoryName}`,
    instructionName,
    `backend/${instructionName}`,
    `frontend/${instructionName}`,
    `product/${instructionName}`,
  ];
  if (removeCodex) {
    paths.push("backend/scripts/validate-agent-parity.py", "frontend/scripts/validate-agent-parity.py", "product/scripts/validate-agent-parity.py");
  }
  await Promise.all(paths.map((path) => rm(join(targetDirectory, path), { recursive: true, force: true })));
}

async function askAgentTooling(prompt) {
  output.write("\nQuais agentes instalar?\n");
  AGENT_OPTIONS.forEach((option, index) => output.write(`  ${index + 1}) ${option.label} — ${option.description}\n`));
  while (true) {
    const answer = await prompt.question("Escolha [1-3]: ");
    const option = AGENT_OPTIONS[Number(answer) - 1];
    if (option !== undefined) return option.value;
    output.write("Escolha 1, 2 ou 3.\n");
  }
}

export function helpText() {
  return [
    "Uso: npx create-axiom-forge <nome-do-projeto>",
    "     npm create axiom-forge -- <nome-do-projeto>",
    "",
    "Opções:",
    "  --agents claude|codex|both   seleciona os agentes sem abrir o menu",
    "  --path <diretório>           define o diretório pai de saída",
    "  -h, --help                   mostra esta ajuda",
    "",
    "Depois da criação, entre no diretório e execute /kickoff.",
  ].join("\n");
}

export async function createProject({ projectName, agentTooling, destination = process.cwd() }) {
  const names = deriveProjectNames(projectName);
  assertAgentTooling(agentTooling);
  const targetDirectory = resolve(destination, names.projectSlug);
  await mkdir(dirname(targetDirectory), { recursive: true });
  await mkdir(targetDirectory, { recursive: false });
  await cp(TEMPLATE_ROOT, targetDirectory, { recursive: true });
  await renderTemplate(targetDirectory, names);
  await installAgentTooling(targetDirectory, agentTooling);
  await adaptGeneratedReadme(targetDirectory, agentTooling);
  await writeFile(join(targetDirectory, ".project-config.json"), `${JSON.stringify({
    name: names.displayName,
    slug: names.projectSlug,
    databaseName: names.databaseName,
    composeProjectName: names.projectSlug,
    rabbitVhost: `/${names.projectSlug}-local`,
    rabbitExchange: `${names.projectSlug}.events`,
    agentTooling,
    generatedBy: "create-axiom-forge",
  }, null, 2)}\n`);
  return Object.freeze({ ...names, agentTooling, targetDirectory });
}

async function adaptGeneratedReadme(targetDirectory, agentTooling) {
  const readmePath = join(targetDirectory, "README.md");
  let readme = await readFile(readmePath, "utf8");
  readme = readme.replace(/\n## Criar um projeto derivado\n[\s\S]*?\n## Segurança\n/, "\n## Segurança\n");
  if (agentTooling === "claude") {
    readme = readme.replace(
      ".agents/    roster técnico cross-squad e skills do orquestrador",
      ".claude/    agentes Claude, regras, hooks e skills do orquestrador",
    );
    readme = readme.replace(".claude/    agentes Claude, regras e hooks compartilhados\n", "");
    readme = readme.replace("python3 .agents/scripts/validate-agent-parity.py\n", "");
  } else {
    readme = readme.replace(".agents/    roster técnico cross-squad e skills do orquestrador\n", "");
    readme = readme.replace(
      ".claude/    agentes Claude, regras e hooks compartilhados",
      ".agents/    roster Codex cross-squad e skills do orquestrador",
    );
  }
  await writeFile(readmePath, readme);

  for (const relativePath of ["docs/engineering/README.md", "product/README.md"]) {
    const path = join(targetDirectory, relativePath);
    let content = await readFile(path, "utf8");
    const rootPrefix = relativePath === "docs/engineering/README.md" ? "../../" : "../";
    const sourceLink = `${rootPrefix}.agents/skills/kickoff/SKILL.md`;
    const selectedLink = `${rootPrefix}${agentTooling === "claude" ? ".claude" : ".agents"}/skills/kickoff/SKILL.md`;
    content = content.replaceAll(sourceLink, selectedLink);
    await writeFile(path, content);
  }
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    output.write(`${helpText()}\n`);
    return;
  }
  if (parsed.projectName === undefined) {
    throw new Error("Informe o nome do projeto. Exemplo: npx create-axiom-forge meu-projeto");
  }
  const prompt = createInterface({ input, output });
  try {
    const agentTooling = parsed.agentTooling ?? await askAgentTooling(prompt);
    const result = await createProject({ projectName: parsed.projectName, agentTooling, destination: parsed.destination });
    output.write(`\n✓ Projeto criado em ${result.targetDirectory}\n`);
    output.write(`  Banco Postgres: ${result.databaseName}\n`);
    output.write(`  Agentes: ${result.agentTooling}\n`);
    output.write("\nPróximos passos:\n");
    output.write(`  cd ${relative(process.cwd(), result.targetDirectory) || "."}\n`);
    output.write("  /kickoff\n");
  } finally {
    prompt.close();
  }
}

const isEntrypoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) main().catch((error) => {
  output.write(`\n✗ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
