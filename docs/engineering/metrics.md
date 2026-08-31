---
name: metrics
description: Modelo neutro para acompanhar fluxo de entrega, qualidade e maturidade de engenharia.
alwaysApply: false
---

# Métricas de engenharia

Use métricas para localizar gargalos e orientar decisões do projeto derivado;
nunca para ranquear pessoas. Registre período, fonte, definição e limitações
antes de comparar resultados.

## Fluxo de entrega

| Métrica | Definição | Fonte sugerida |
|---|---|---|
| Lead time | tempo entre o início de uma mudança aprovada e sua entrega | Git + CI/CD |
| Throughput | mudanças concluídas no período | GitHub/Jira/Linear |
| Deployment frequency | entregas em ambiente de produção por período | plataforma de deploy |
| Change failure rate | entregas que exigiram rollback ou correção urgente | deploy + incidentes |

Não preencha valores sem uma fonte verificável. Quando não houver histórico,
marque a métrica como `BLOCKED` e registre qual integração ou processo falta.

## Qualidade e segurança

| Métrica | Evidência mínima |
|---|---|
| Testes | comando, escopo e resultado do runner |
| Cobertura | relatório gerado pelo runner, com limites declarados |
| Análise estática | lint, typecheck, build e relatório do scanner |
| Tempo de correção | issues/findings com abertura e fechamento |
| Falhas de pipeline | execuções do CI e causa classificada |

Gates vermelhos são fatos operacionais, não números a serem suavizados. Corrija
a causa ou registre explicitamente o bloqueio, impacto, reversão e próximo owner.

## Registro

Para cada atualização, use o formato:

```text
Período: <intervalo>
Fonte: <comando, dashboard ou integração>
Resultado: <valor ou BLOCKED>
Interpretação: <gargalo ou tendência observada>
Próxima ação: <owner e evidência esperada>
```
