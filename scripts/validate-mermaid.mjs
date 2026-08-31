#!/usr/bin/env node
// Validador estrutural de blocos Mermaid em arquivos .md.
// Zero-dep (não renderiza): pega os erros que mais quebram o render e que o agente mais comete —
//   • bloco vazio                              (fatal)
//   • tipo de diagrama ausente/desconhecido    (fatal)
//   • aspas duplas desbalanceadas              (fatal)
//   • (), [] ou {} desbalanceados              (aviso — shapes assimétricos `>...]` dão falso-positivo)
// Uso: node scripts/validate-mermaid.mjs [dir]   (default: ".")
// Sai com código 1 se houver erro fatal. Serve de gate na CI e no /diagramar.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, extname, relative } from "node:path";

const ROOT = resolve(process.argv[2] || ".");
// Mesmas pastas que o audit ignora: derivadas/sistema, não a fonte canônica.
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".spec-driven",
  ".agents", ".cursor", ".gemini", ".windsurf",
]);

// Tipos de diagrama reconhecidos pelo Mermaid (primeira palavra do bloco).
const TYPES = new Set([
  "flowchart", "graph", "sequenceDiagram", "classDiagram", "classDiagram-v2",
  "stateDiagram", "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie",
  "mindmap", "timeline", "gitGraph", "quadrantChart", "requirementDiagram",
  "C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment",
  "sankey-beta", "xychart-beta", "block-beta", "packet-beta", "architecture-beta",
  "kanban", "radar", "zenuml",
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name) || name.startsWith(".tmp")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (extname(full) === ".md") out.push(full);
  }
  return out;
}

// Extrai cada bloco ```mermaid … ``` com a linha (1-based) onde a cerca abre.
function mermaidBlocks(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    if (cur === null) {
      if (/^\s*```\s*mermaid\s*$/i.test(lines[i])) cur = { start: i + 1, body: [] };
    } else if (/^\s*```\s*$/.test(lines[i])) {
      blocks.push(cur); cur = null;
    } else {
      cur.body.push(lines[i]);
    }
  }
  return blocks;
}

// Tira comentários/diretivas (%% até o fim da linha) — também derruba `%%{init:…}%%`.
const stripComments = (body) =>
  body.map((l) => { const i = l.indexOf("%%"); return i === -1 ? l : l.slice(0, i); }).join("\n");

const errors = [];
const warns = [];

for (const f of walk(ROOT)) {
  const rel = relative(ROOT, f) || f;
  let blocks;
  try { blocks = mermaidBlocks(readFileSync(f, "utf8")); } catch { continue; }

  blocks.forEach((b, n) => {
    const where = `${rel} (bloco mermaid #${n + 1}, linha ${b.start})`;

    // 1) Tipo de diagrama: 1ª linha significativa (pula vazias, comentários e frontmatter ---…---).
    let i = 0;
    while (i < b.body.length && b.body[i].trim() === "") i++;
    if (i < b.body.length && b.body[i].trim() === "---") {           // frontmatter YAML interno
      i++;
      while (i < b.body.length && b.body[i].trim() !== "---") i++;
      i++;
    }
    while (i < b.body.length && (b.body[i].trim() === "" || b.body[i].trim().startsWith("%%"))) i++;
    const first = i < b.body.length ? b.body[i].trim() : "";
    if (!first) { errors.push(`${where}: bloco mermaid vazio`); return; }
    const kw = (first.match(/^([A-Za-z][\w-]*)/) || [])[1] || "";
    if (!TYPES.has(kw)) errors.push(`${where}: tipo de diagrama ausente/desconhecido ("${first.slice(0, 30)}")`);

    // 2) Aspas duplas balanceadas (fatal).
    const stripped = stripComments(b.body);
    const quotes = (stripped.match(/"/g) || []).length;
    if (quotes % 2 !== 0) errors.push(`${where}: aspas duplas desbalanceadas (${quotes})`);

    // 3) Delimitadores (aviso) — ignora o que está entre aspas.
    let outside = "", inQ = false;
    for (const ch of stripped) {
      if (ch === '"') inQ = !inQ;
      else if (!inQ) outside += ch;
    }
    for (const [op, cl, label] of [["(", ")", "()"], ["[", "]", "[]"], ["{", "}", "{}"]]) {
      const o = outside.split(op).length - 1;
      const c = outside.split(cl).length - 1;
      if (o !== c) warns.push(`${where}: ${label} possivelmente desbalanceado (${o} aberto / ${c} fechado)`);
    }
  });
}

if (warns.length) {
  console.log(`\n⚠ Avisos Mermaid (${warns.length}) — confira (shapes assimétricos \`>…]\` podem ser falso-positivo):`);
  for (const w of warns) console.log(`  • ${w}`);
}
if (errors.length) {
  console.error(`\n✗ Validação Mermaid: ${errors.length} erro(s)\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("");
  process.exit(1);
}
console.log(`✓ Validação Mermaid: blocos OK (tipo, aspas, delimitadores).`);
