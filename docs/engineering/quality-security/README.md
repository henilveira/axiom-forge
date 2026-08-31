---
name: quality-security-library
description: Método de teste, revisão estrutural, segurança e release das features projeto derivado.
alwaysApply: false
---

# Qualidade e segurança

`test-engineer` transforma AC/BR em unit, integration, contract e E2E; `quality-engineer` revisa
arquitetura, manutenção e regressão; `security-reviewer` percorre identidade, tenant, ASVS, dados,
logs e efeitos; `release-engineer` fecha gates e rollback.

## Evidência mínima

Unit prova regra pura; integration prova DB/adapters/tenant/transação/concorrência; contract prova
request/response/status/error/auth/nullable; E2E prova a jornada. Mock não substitui risco de I/O e
produção nunca importa `test/`.

## Bloqueios

Spec/contrato ambíguo, segredo, IDOR/cross-tenant, bypass de auth/CSRF, PII em log, migration
destrutiva, gate vermelho ou teste que não falha quando o código quebra. Findings têm severidade,
evidência, impacto, owner e regressão.
