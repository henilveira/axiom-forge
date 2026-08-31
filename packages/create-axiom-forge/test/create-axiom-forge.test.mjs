import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createProject,
  deriveProjectNames,
  parseArguments,
  slugifyProjectName,
  transformTemplateText,
} from "../bin/create-axiom-forge.mjs";

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
