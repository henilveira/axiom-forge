#!/usr/bin/env node
// Hook SessionStart — injeta o contexto base SDD (docs alwaysApply: true) no início da sessão.
// O stdout deste script é adicionado ao contexto do Claude Code.
// Roda a partir da raiz do projeto; lê só o que existe (no scaffold cru, só o STATE).

import { existsSync } from "node:fs";

// O hook só anuncia o índice. Conteúdo grande é carregado pelo orquestrador por modo e task.
const INDEX = [
  "AGENTS.md",
  "CLAUDE.md",
  "docs/STATE.md",
  "docs/engineering/state/active-delegation.yaml",
];

const available = INDEX.filter((file) => existsSync(file));
let out = "# Contexto SDD disponível sob demanda\n";
out += "> Leia apenas o contrato, STATE/DAG, Git e os artefatos ligados à task atual.\n";
out += `> Índice presente: ${available.join(", ") || "nenhum arquivo base"}.\n`;
out += "> A spec ativa e o método da camada são descobertos pelo STATE/DAG; não injete o histórico inteiro na sessão.\n";

process.stdout.write(out);
