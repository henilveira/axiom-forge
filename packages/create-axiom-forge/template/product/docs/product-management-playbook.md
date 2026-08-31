---
name: product-management-playbook
description: Método neutro de discovery, decisão e especificação para projetos derivados.
alwaysApply: false
---

# Product Management Playbook

O squad de Produto decide por que algo deve existir e qual comportamento
representa valor. Este boilerplate não traz uma resposta pronta: discovery deve
começar pelo problema, pelas pessoas afetadas e pelas evidências do projeto.

## Pipeline

```text
problema → evidência → outcome → hipótese → discovery
  → PRD → épico → história/AC → spec aprovada → handoff para engenharia
```

## Princípios

- evidência antes de opinião;
- problema antes de solução;
- outcome antes de output;
- hipótese rotulada não é regra;
- regra de produto só existe quando está em spec aprovada;
- mudanças de significado geram versão, decisão e rastreabilidade.

## Discovery

Registre objetivo, perguntas, participantes, consentimento, método, evidência,
limitações, confiança e decisão. Se uma resposta puder mudar escopo,
permissão, dados, estados ou métrica, abra uma `OPEN-REQ` antes de codar.

## Spec

O `spec.md` contém critérios de aceite numerados, atores, estados, erros,
concorrência, dados visíveis, efeitos, observabilidade, migração, rollback e
fora de escopo. `domain.md`, `design.md` e `tasks.md` refinam a spec sem
inventar comportamento.

## Gate de aprovação

Não aprovar uma história sem problema, outcome, fonte, escopo, AC testável,
permissões, estados, erros, métricas, riscos, privacidade e rollback definidos.
