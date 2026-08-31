---
name: diagrams
description: Diagramas de arquitetura de alto nível (Mermaid). Puxe ao desenhar ou rever a arquitetura. Gerado por /diagramar.
alwaysApply: false
---

# Diagramas de arquitetura

> Alto nível (C4 L1–L2 + mapa de bounded contexts). Gerado/atualizado por `/diagramar`.
> Renderiza no GitHub e no Claude Code. Mantenha em sincronia com `context-map.md` e os `design.md`.
> Rótulos na linguagem ubíqua do `glossary.md`.

## 1. Contexto do sistema (C4 L1)
> O sistema no centro, com personas e sistemas externos. Sem detalhe interno.

```mermaid
flowchart LR
  user([Persona]) --> sys[Sistema]
  sys --> ext[Sistema externo]
```

## 2. Containers (C4 L2)
> As peças que rodam (UI, serviços, dados, filas) e como conversam.

```mermaid
flowchart LR
  UI[App / UI] --> API[API / Serviço]
  API --> DB[(Banco)]
  API --> Q[[Fila]]
  API --> EXT[Sistema externo]
```

## 3. Mapa de bounded contexts (DDD)
> Os contextos do sistema e o padrão de relação entre eles.

```mermaid
flowchart TB
  A[Contexto A - core] -->|ACL| B[Contexto B]
  A -->|Customer/Supplier| C[Contexto C]
```

<!-- (opcional) 4. Fluxo-chave: uma jornada crítica em sequenceDiagram. -->
