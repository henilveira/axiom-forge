---
name: roadmap
description: Prioridades atuais em horizontes Now/Next/Later.
alwaysApply: true
---

# Roadmap — <nome do projeto>

> Plano incremental para implementar **com o time**. Produzido na descoberta e revisado por ciclo.
> Greenfield: sequência de entrega do MVP. Brownfield: adoção do SDD + dívidas/melhorias.
> Princípio: **quick wins de baixo risco primeiro** para gerar tração e confiança do time.

## Objetivo do roadmap
<O que queremos alcançar nos próximos N meses e como mediremos progresso.>

## Horizontes
> Now / Next / Later evita a falsa precisão de datas distantes. Datas só no "Agora".

### 🟢 Agora (este ciclo)
| # | Item                          | Valor | Esforço | Dono  | Depende de | Pronto quando |
|---|-------------------------------|-------|---------|-------|------------|---------------|
| 1 | <quick win de baixo risco>    | alto  | baixo   | <nome>| —          | <critério>    |

### 🟡 Próximo
| # | Item                          | Valor | Esforço | Dono  | Depende de |
|---|-------------------------------|-------|---------|-------|------------|
| 1 | <…>                           |       |         |       |            |

### ⚪ Depois (hipóteses / a validar)
| # | Item                          | Por que esperar |
|---|-------------------------------|-----------------|
| 1 | <…>                           | <decisão/dado pendente> |

## Adoção do SDD (apenas brownfield)
> Não faça big-bang. Introduza a esteira pela próxima feature e backfill o resto aos poucos.
- [ ] Próxima feature já nasce com `spec.md` + `CLAUDE.md`
- [ ] Backfill de ADRs para as 3-5 decisões estruturais mais importantes
- [ ] `context-map.md` reverse-engineered e validado com o time
- [ ] Glossário semeado com os termos que já causam confusão

## Como rodar com o time
- **Cadência de revisão do roadmap:** <ex.: a cada 2 semanas>
- **Quem decide prioridade:** <papel>
- **Definition of Ready/Done:** ver `README.md`
