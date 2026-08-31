---
name: static-analysis
description: Gate executável de convenções, fronteiras arquiteturais, tipos e código morto dos apps projeto derivado.
alwaysApply: false
---

# Análise estática — contratos que o lint bloqueia

O lint é bloqueante. Ele não substitui revisão, testes ou a spec; impede que regras estruturais
objetivas dependam apenas de memória humana. Rode os comandos do app alterado antes de handoff.

## Stack

- **ESLint + typescript-eslint:** tipos públicos explícitos, `any` proibido, operações inseguras e
  casts evasivos bloqueados nos módulos/features.
- **@boundaries/eslint-plugin:** aplica `interfaces → application → domain ← infrastructure` no
  backend e `contracts → services → queries/mutations → forms/orchestration → components` no
  frontend. Teste nunca é dependência de produção.
- **SonarJS:** limita complexidade cognitiva a 12, profundidade a 3, função a 80 linhas e arquivo
  a 350 linhas. Extraia por responsabilidade; não fragmente artificialmente.
- **check-file:** arquivo e pasta em `kebab-case`; não crie `utils`, `helpers`, `common` ou
  `manager` genéricos. Nomeie pelo dono e pela intenção.
- **Knip:** detecta arquivo, export, tipo, dependência, binário ou import não alcançável. Corrija o
  grafo/entrypoint; não silencie descoberta sem razão técnica documentada.

## Perfil “prova formal”

Nos módulos e features, o gate também rejeita cast `as` e non-null assertion, condição que não é
booleano, condição sempre verdadeira/falsa, `switch` não exaustivo, `Promise` mal usado, `else`
depois de retorno, ternário aninhado, reatribuição de parâmetro, `console`, comparação frouxa,
números mágicos, `Math.random()` e leitura de `Date` no domínio. Uma função tem no máximo 20
statements, duas callbacks aninhadas e a convenção exige `camelCase`/`PascalCase` coerente.

O compilador reforça `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noPropertyAccessFromIndexSignature`, `noImplicitReturns` e `noImplicitOverride`. Quando uma regra
parecer inconveniente, a pergunta correta é: “qual contrato ficou implícito?”. Exceção local exige
motivo, owner e remoção planejada; não é atalho permanente.
## Imports internos, barrels e pacotes externos

O lint diferencia o grafo interno do projeto de `node_modules`; portanto `react`, `next`, `@nestjs/*`,
`@tanstack/*` e outros plugins externos não são tratados como imports internos.
Isso não anula restrições de responsabilidade: por exemplo, um service continua sem poder importar
React/Next/Query por regra de camada, mas o diagnóstico será o da camada, não `AF-ARCH-IMPORT-001/002`.

- **Frontend:** `../pasta/arquivo`, `../../pasta/arquivo` e `./pasta/arquivo` são bloqueados com
  `AF-ARCH-IMPORT-001`. Exporte o símbolo no barrel raiz de `src/index.ts` e importe exatamente por
  `@`. `./arquivo` para um vizinho da mesma pasta continua válido; um import para `../pasta` que
  resolve para o `index.ts` da pasta também é aceito para evitar ciclos desnecessários durante a
  composição de uma feature.
- **Frontend:** `@/features/...` ou outro alias interno profundo é bloqueado com
  `AF-ARCH-IMPORT-002`; o alias público é somente `@`. Não confunda `@/**` com pacotes escopados:
  `@tanstack/*` e `@nestjs/*` continuam sendo externos.
- **Backend:** imports relativos entre `domain`, `application`, `infrastructure` e `interfaces`
  são uma exceção deliberada do ADR-0010 e não devem ser “corrigidos” para `@`. O gate bloqueia
  `@/camada/...` (alias profundo); a composição externa usa o barrel raiz exatamente como `@`.

As mensagens carregam o código `AF-ARCH-IMPORT-00x` para que uma IA ou revisor consiga identificar
o diagnóstico e aplicar a correção sem desabilitar a regra. Nunca use `eslint-disable` para contornar
esse gate; ajuste o `index.ts` dono ou peça uma decisão ao Tech Lead quando houver risco de ciclo.

## Tipos e assinaturas

Em código de produção de `src/modules/**` e `src/features/**`, declaração `type`, `interface` ou
`enum` só pode morar em arquivo dedicado: backend `*.types.ts`, `*.port.ts`, `*.dto.ts`,
`*.event.ts`, `*.error.ts`, `*.schema.ts`; frontend `*.types.ts`, `*.schema.ts`, `*.props.ts`.
Cada export público tem argumento e retorno explícitos. Inferência local continua permitida quando
o tipo é óbvio; ela não substitui contrato de fronteira.

## Comandos

| App | Convenções/arquitetura | Código morto |
|---|---|---|
| backend | `npm run lint` | `npm run quality:dead-code` |
| frontend | `npm run lint` | `npm run quality:dead-code` |

`tailwindcss` é a única exceção atual do Knip: é consumido pelo `@import` de CSS/PostCSS, que não
é visível no grafo de imports TypeScript. Ao remover Tailwind, remova também essa exceção.

Se uma regra impedir um desenho válido, não a desligue no arquivo. Abra decisão para o Tech Lead,
registre ADR se for estrutural e altere o gate de forma centralizada, com teste de configuração.
