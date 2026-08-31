---
name: adr-0004
description: Convenção global de barrel exports (index.ts) — todo import entre pastas passa pelo index.ts mais externo do app.
alwaysApply: false
---

# ADR-0004: Barrel exports — um único ponto de import por app

- **Status:** aceito
- **Data:** 2026-08-26
- **Decisores:** dono do projeto derivado

## Contexto
Com `apps/backend` e `apps/frontend` recém-criados (Fase 0 #4), o dono do projeto definiu uma
convenção de código **global**, para os dois apps, antes que exista código de negócio suficiente
para tornar a mudança cara: cada pasta de código exporta via `index.ts`, e todo import entre
pastas passa pelo `index.ts` mais externo do app — um único ponto de entrada por app.

## Decisão
- **Toda pasta de código** (dentro de `apps/backend/src/**` e `apps/frontend/src/**`) tem um
  `index.ts` que reexporta tudo daquela pasta.
- Esses `index.ts` **concentram para cima**: pasta-filha exporta pro `index.ts` da pasta-pai, até
  chegar num **único `index.ts` raiz por app** (`apps/backend/src/index.ts` e
  `apps/frontend/src/index.ts`). Os dois nunca se misturam — cada app tem seu próprio barrel raiz.
- **Import entre pastas diferentes sempre pelo barrel mais externo** (o `index.ts` raiz do app),
  nunca pelo caminho direto do arquivo nem pelo `index.ts` de uma pasta intermediária. Import
  dentro da mesma pasta (arquivo vizinho) continua relativo, sem passar pelo barrel.
- Alias de import (`@` → `src/index.ts`, sem wildcard) em cada `tsconfig.json`, pra ficar
  `import { Foo } from '@'` em vez de caminho relativo longo.
- **Continua valendo a regra de dependência entre camadas do backend** (`domain/` não importa
  `infrastructure/`, etc. — ver `CLAUDE.md`) — o barrel muda *como* se importa, não *o que* pode
  ser importado. `application/` importando algo de `domain/` faz isso via `@`, não via
  `../domain/index`.

## Alternativas consideradas
| Alternativa | Por que (não) escolhida |
|---|---|
| Barrel só por pasta, sem concentrar num único raiz (import via barrel da pasta vizinha) | Descartada — o dono quer explicitamente **um único lugar** de import, não vários barrels espalhados |
| Sem barrel, import direto do arquivo (padrão mais comum) | Descartada — decisão explícita do dono, motivada por simplicidade de import, não por padrão de mercado |

## Consequências
- **+** Um único import surface por app — quem consome não precisa saber a estrutura de pasta de
  quem produz, só importa de `@`.
- **+** Refatorar a localização interna de um arquivo não quebra quem o consome de fora da pasta,
  desde que o barrel seja atualizado.
- **−** **Risco real de import circular**: o barrel raiz reexporta de `domain/application/infrastructure/interfaces`,
  e código dentro dessas pastas importa de volta do barrel raiz — isso é um ciclo por construção.
  Mitigado com `import/no-cycle` (ESLint) como gate bloqueante, e disciplina de export ordering
  (barril de baixo pra cima, nunca uma pasta reexportando algo que depende dela mesma via ciclo
  de valor, não só de tipo).
- **−** Barrel único tende a piorar tree-shaking e alongar grafo de import — aceito conscientemente
  dado o tamanho do projeto (dois apps, não uma lib publicada); revisitar se algum dia isso pesar
  em tempo de build.
- **−** Todo PR que cria um arquivo novo precisa lembrar de atualizar o barrel da pasta — sem
  automação inicial (gerar via script fica pra quando incomodar de verdade).
