---
name: design
description: Technical Design Doc — 5 eixos + tabelas de dependências, solução, riscos e roadmap, com links ao repo de artefatos do time. Puxe ao desenhar feature arquitetural.
alwaysApply: false
---

# Technical Design Doc — <nome da feature>

> **Tier:** arquitetural · **Status:** rascunho | em review | aprovado
> **Autor:** <nome> · **Revisores:** <nomes> · **Data:** <YYYY-MM-DD>
> Responde: **como** no nível de sistema. Obrigatório no tier arquitetural.

## Links e artefatos
> Conexão com o repositório de artefatos do time. Publique via `/integracoes` (escrita repo → ferramenta).

| Artefato                 | Onde                  | Link                        |
|--------------------------|-----------------------|-----------------------------|
| Página do design         | Confluence / Notion   | <url>                       |
| Issue / épico            | Jira / Linear         | <PROJ-123>                  |
| Repo de artefatos        | <Drive / wiki / repo> | <url>                       |
| Spec · Product · Domínio | repositório           | `./spec.md` · `./product.md` · `./domain.md` |

## Contexto da funcionalidade
<Estado atual, restrições, por que agora. O problema que esta feature resolve (link `product.md`).>

## Goals / Non-goals
**Goals**
- <objetivo técnico mensurável>

**Non-goals**
- <fora de escopo deste design>

## Glossário (da funcionalidade)
> Termos específicos desta feature. Termo novo → **promova ao `docs/glossary.md`** (linguagem ubíqua).

| Termo     | Descrição                                  |
|-----------|--------------------------------------------|
| <Termo>   | <significado preciso no contexto da feature> |

## Design proposto
<A solução. Diagramas (C4/sequência — gere com `/diagramar`), componentes, fluxo de dados,
contratos de API, modelo de dados. Mostre as fronteiras com os bounded contexts existentes.>

## Cobertura dos 5 eixos
> Toda decisão técnica passa por estes 5 eixos. Preencha o que toca; marque "sem impacto" no resto.
> Decisão estrutural em qualquer eixo → vira ADR.

### 1. Tech stack
<Linguagens, frameworks, libs ou serviços novos. Versões. Diverge do stack padrão? Justifique.>
### 2. Arquitetura base
<Como encaixa nas camadas e bounded contexts. Nova fronteira? Novos agregados/portas? Padrão de integração.>
### 3. Infra
<Recursos novos (fila, cache, banco), ambientes, IaC, custo. Deploy, feature flag, **reversão segura**.>
### 4. Qualidade
<Estratégia de teste e o que cobre os AC. Gates: cobertura, contract test, performance, segurança.>
### 5. Observabilidade
<Métricas, logs, tracing, alertas. SLO/SLI. Como a telemetria prova que funciona?>

## Mapa de dependências
> O que esta feature consome/integra. Inclua APIs, serviços, libs e dados.

| Dependência        | Tipo        | Descrição                  | Principais métodos / endpoints        |
|--------------------|-------------|----------------------------|---------------------------------------|
| <ex.: API Pagamentos> | REST / gRPC | <cobra e estorna cartão>   | `POST /charges` · `GET /charges/{id}` |
| <ex.: lib X>       | biblioteca  | <para quê>                 | <funções-chave>                       |

## Solução
> Blocos da solução e seu estado. **Indefinido** = ainda em aberto (vira spike ou Questão em aberto).
> A quebra fina e executável vai para o `tasks.md`.

| #  | Tarefa / bloco        | Descrição                       | Status               |
|----|-----------------------|---------------------------------|----------------------|
| 1  | <…>                   | <o que faz>                     | definido             |
| 2  | <…>                   | <o que faz>                     | indefinido           |

## Alternativas consideradas
> A seção mais valiosa do doc — mostra que o trade-off foi pensado.

| Alternativa   | Prós | Contras | Por que (não) escolhida |
|---------------|------|---------|-------------------------|
| A (escolhida) |      |         |                         |
| B             |      |         |                         |

## Trade-offs e consequências
<O que ganhamos e o que aceitamos perder. Dívida técnica assumida conscientemente.>

## Riscos
| Risco   | Descrição          | Prob. × Impacto    | Ações / mitigações |
|---------|--------------------|--------------------|--------------------|
| <risco> | <por que acontece> | médio × alto       | <o que fazer / como mitigar> |

## Roadmap da feature
> Fases/ondas de entrega desta feature. A Onda 1 alimenta o `docs/product/roadmap.md` global.

| Fase / onda | Entrega                | Quando         | Depende de |
|-------------|------------------------|----------------|------------|
| 1 (MVP)     | <fatia que valida>     | <ciclo/sprint> | —          |
| 2           | <incremento>           | <depois>       | 1          |

## Questões em aberto
- [ ] <decisão pendente — quem responde, até quando>

> Decisões difíceis de reverter tomadas aqui → registre como ADR em `docs/architecture/adr/`.
