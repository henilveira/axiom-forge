---
name: spec
description: Contrato da feature (critérios de aceite). Base enquanto a feature está ativa.
alwaysApply: true
---

# Spec — <nome da feature>

> **Fonte da verdade.** Status: rascunho | em review | aprovado | implementado
> Os critérios de aceite são (a) o contrato com o negócio, (b) o oráculo de teste,
> (c) o prompt para o agente de IA implementar. Escreva-os para serem executáveis.

## Resumo
<Uma frase: o que o sistema passará a fazer.>

## Critérios de aceite
> Formato Given/When/Then. Cada critério deve ser testável e não-ambíguo.
> **Cada `AC-N` é um ID rastreável:** ele reaparece em `tasks.md` (coluna "Cobre AC"), no teste
> de aceite que o valida e na mensagem de commit. Não renumere ACs já implementados.

### AC-1: <título do cenário>
- **Dado** <estado/pré-condição>
- **Quando** <ação/evento>
- **Então** <resultado observável e verificável>

### AC-2: <título>
- **Dado** …
- **Quando** …
- **Então** …

## Matriz de decisão (opcional)
> Use **quando a regra combina vários fatores** (flags, estados, papéis, modos). Uma tabela-verdade
> é mais densa, menos ambígua e mais barata em tokens que a mesma regra em prosa — e **cada linha
> vira um caso de teste**. Os fatores são colunas; a última coluna é o resultado observável.
> Ligue cada linha ao `AC-N` que ela detalha (a coluna "AC" mantém a rastreabilidade).
> Nem tudo cabe numa matriz: fluxo temporal e sequência ficam melhor em Given/When/Then acima.

| Fator A | Fator B | … | Resultado esperado | AC |
|---------|---------|---|--------------------|------|
| <valor> | <valor> | … | <ação observável>  | AC-1 |
| <valor> | <valor> | … | <ação observável>  | AC-2 |

> Cubra **todas as combinações relevantes** (inclusive as "impossíveis" que devem ser rejeitadas).
> `—` = fator irrelevante naquela linha. Linha sem `AC` → provavelmente falta um critério de aceite.

## Casos de borda e erros
- <entrada inválida → comportamento esperado>
- <concorrência, timeout, falha de dependência → comportamento esperado>

## Fora de escopo
> Vinculante. Não implemente nada aqui.
- <…>

## Rastreabilidade
- Product: `./product.md`
- Design: `./design.md` (se tier arquitetural)
- Domínio: `./domain.md`
- ADRs relacionados: <links>
