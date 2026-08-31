---
name: <nome-da-skill>
description: <quando usar, em terceira pessoa, com gatilhos claros. Ex.: "Use para abrir uma nova feature no padrão SDD, escolhendo o tier e copiando os templates." Acione com /<nome>.>
---

# Skill: <título>

<Objetivo em 1-2 frases.>

## Processo
1. <passo — use AskUserQuestion para decisões do usuário>
2. <passo>

## Saídas
- <arquivos/efeitos que a skill produz>

## Regras
- Confirme antes de ações outward-facing (publicar, criar issue, configurar MCP).
- Siga a esteira do `README.md` e as convenções do `CLAUDE.md`.
- Skills *tools-aware* (dependem de MCP) checam `mcp__<servidor>__*` e degradam com elegância se não houver.

<!-- Template em formato de skill (dialeto do alvo: name + description, sem alwaysApply).
     Copie para .claude/skills/<nome>/SKILL.md. Aqui em _templates/ não é carregado como skill. -->
