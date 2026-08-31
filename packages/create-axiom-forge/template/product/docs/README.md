---
name: product-library
description: Biblioteca vazia para descobrir, decidir e especificar o produto de um projeto derivado.
alwaysApply: false
---

# Product Workspace

Esta pasta começa deliberadamente sem contexto de negócio. Ela é o lugar para
registrar o problema, a evidência, o vocabulário e o comportamento do produto
que será criado a partir deste boilerplate.

## Ponto de entrada

- [Playbook de Product Management](product-management-playbook.md) — método de discovery e decisão.
- [Biblioteca de referência](product/README.md) — índice vazio para contexto do projeto.
- [Conhecimento do produto](knowledge/README.md) — registro de evidências a preencher.
- [Glossário](glossary.md) — linguagem ubíqua do projeto derivado.
- [Épicos](epics/README.md) — resultados e ligação para histórias.
- `_templates/` — modelos de visão, jornada, stakeholders, MVP, PRD, histórias,
  intake de kickoff, pesquisa de mercado e hipóteses.
- `../specs/` — specs aprovadas e seus artefatos técnicos.

## Regras de escrita

Produto usa português, exemplos observáveis e critérios verificáveis. Toda
decisão deve apontar fonte, owner, data, status e impacto. Hipótese não é fato;
rascunho não autoriza implementação.

## Handoff para engenharia

Uma história só chega à engenharia com problema, outcome, escopo, estados,
permissões, erros, métricas, riscos e critérios Given/When/Then claros. A spec
aprovada é a fonte de verdade; esta pasta nunca substitui o contrato técnico.
