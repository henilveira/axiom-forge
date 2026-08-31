---
name: architecture-overview
description: Arquitetura do sistema nos 5 eixos + segurança e operacional. Puxe ao trabalhar em arquitetura, infra, qualidade, observabilidade ou segurança.
alwaysApply: false
---

# Arquitetura do sistema

> Visão **consolidada** do sistema pelos 5 eixos (+ segurança e operacional). Cada seção é um
> **resumo curto + link** para o detalhe (ADRs, context-map, diagrams, TESTING). Gerado/atualizado
> no `phase-orchestrator`. **Mantenha enxuto** — o detalhe vive nos docs linkados, aqui é o mapa.

## 1. Tech stack
<Linguagens, frameworks, runtime, gerência de pacotes, versões alvo.>
- Decisão: [ADR-XXXX](adr/XXXX-tech-stack.md)

## 2. Arquitetura base
<Estilo (monolito modular / serviços / serverless), camadas (DDD), principais bounded contexts.>
- Mapa de contextos: [context-map.md](context-map.md) · Diagramas: [diagrams.md](diagrams.md)
- Decisão: [ADR-XXXX](adr/XXXX-estilo-de-arquitetura.md)

## 3. Infra
<Cloud/provedor, ambientes (dev/stg/prod), modelo de deploy, IaC, custo.>
- Decisão: [ADR-XXXX](adr/XXXX-infra-e-deploy.md) · Operacional: ver seção 7.

## 4. Qualidade
<Estratégia de testes (pirâmide), cobertura mínima, lint/format, análise estática (type-check/complexidade/SAST), política de review.>
- Comandos e gates: [TESTING.md](../engineering/TESTING.md)

## 5. Observabilidade
<Logs estruturados, métricas, tracing, alertas e SLO/SLI do sistema.>
- Decisão: [ADR-XXXX](adr/XXXX-observabilidade.md)

## 6. Segurança
<Autenticação e autorização, controles e políticas, proteção de dados (PII/criptografia),
conformidade (LGPD/GDPR/…), gestão de segredos. Decisões difíceis de reverter → ADR.>

## 7. Operacional
<Deploy e rollback, monitoramento e alertas (quem é acionado), backup e recuperação,
runbook de incidentes. Liga-se aos eixos Infra (3) e Observabilidade (5).>
