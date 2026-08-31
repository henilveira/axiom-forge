---
name: ADR-0001
description: Decisão de usar ADRs. Puxe ao registrar ou rever decisões.
alwaysApply: false
---

# ADR-0001: Registrar decisões de arquitetura como ADRs

- **Status:** aceito
- **Data:** <YYYY-MM-DD>
- **Decisores:** <nomes>

## Contexto
Decisões arquiteturais difíceis de reverter precisam de memória durável. Sem isso,
o time reabre as mesmas discussões e perde o *porquê* de escolhas antigas.

## Decisão
Usaremos **Architecture Decision Records** (formato Nygard) em `docs/architecture/adr/`.
- Um arquivo por decisão, numerado sequencialmente: `NNNN-titulo.md`.
- ADRs são **imutáveis**. Para mudar uma decisão, crie um novo ADR com status
  `substitui ADR-XXXX` e marque o antigo como `substituído por ADR-YYYY`.
- Crie um ADR quando a decisão for difícil de reverter (escolha de banco,
  fronteira de contexto, protocolo de integração, padrão transversal).

## Consequências
- **+** Rastreabilidade do *porquê*; onboarding mais rápido.
- **+** Reviews mais objetivos (a decisão tem um lar).
- **−** Pequeno overhead por decisão — aceitável e restrito ao tier arquitetural.

## Template para novos ADRs
Ver `docs/architecture/adr/_template.md`.
