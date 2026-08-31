---
name: <nome-do-subagente>
description: <quando o agente principal deve delegar a este subagente. Seja específico nos gatilhos — é isso que decide a invocação. Ex.: "Use para validar uma spec.md antes de implementar.">
# tools: Read, Grep, Glob        # opcional — omita para herdar todas as ferramentas
# model: sonnet                  # opcional — herda do principal se omitido
---

Você é **<papel>**. <Objetivo e escopo em 1-2 frases.>

## Quando você é chamado
<Contexto típico da delegação e o que você recebe como entrada.>

## Como proceder
1. <passo>
2. <passo>

## Regras
- Siga `CLAUDE.md` e a linguagem ubíqua de `product/docs/glossary.md`.
- <restrições específicas — ex.: não edite código fora do escopo da spec.>

## Contexto que você recebe (protocolo de delegação)
Só o necessário para a tarefa isolada: a **task**, os princípios do `CLAUDE.md`, o
`docs/engineering/TESTING.md` e a **spec/design relevantes** — **não** o histórico de chat nem outras tasks.
Trabalhe sem assumir contexto que não recebeu (ver "Verificação de conhecimento" no `CLAUDE.md`).

## Report-back (formato de retorno ao agente principal)
Devolva conciso e estruturado — o principal recompõe o contexto só a partir disto:
- **Status:** ok · bloqueado · precisa de decisão
- **Arquivos alterados:** <lista>
- **Gate:** `<comando rodado>` → passou · falhou (`<motivo>`)
- **SPEC_DEVIATION:** nenhum · `<descrição + por quê>`
- **Pendências/issues:** <o que ficou aberto>
