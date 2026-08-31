---
name: project-home
description: Índice da documentação do boilerplate e do projeto derivado.
alwaysApply: false
---

# Mapa da documentação

O boilerplate não contém contexto de negócio. O detalhe vive no documento
dono; não duplique regras entre Produto, Engenharia e código.

## Comece por

- [Estado atual](STATE.md) — checkpoint, bloqueios e próximo passo.
- [Product Workspace](../product/docs/README.md) — discovery e biblioteca vazia.
- [Biblioteca de specs](../product/specs/README.md) — contrato aprovado para engenharia.
- [Biblioteca de engenharia](engineering/README.md) — método, arquitetura, testes e segurança.

## Produto e especificação

- `../product/README.md` — ownership e limites do squad de Produto.
- `../product/docs/knowledge/` — evidências e decisões do projeto derivado.
- `../product/docs/epics/` — épicos e histórias.
- `../product/specs/` — specs, design, domínio, tasks e manifests.

## Arquitetura e operação

- `architecture/adr/` — decisões técnicas duráveis.
- `architecture/context-map.md` — fronteiras que o projeto derivado decidir.
- `architecture/overview.md` — mapa dos cinco eixos.
- `engineering/TESTING.md` — comandos e estratégia de gates.
- `engineering/state/active-delegation.yaml` — DAG persistente.

## Regra de atualização

Regra transversal entra na biblioteca de engenharia ou em ADR; decisão de
produto entra em `product/`; estado vivo entra em `STATE.md` e no YAML. Links
quebrados e nomes de produto específicos no boilerplate são falhas de higiene.
