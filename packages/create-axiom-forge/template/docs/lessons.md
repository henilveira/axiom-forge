---
name: lessons
description: Aprendizados transversais e gotchas descobertos durante o trabalho — quirks de lib, armadilhas de setup, suposições que se provaram erradas. Área de staging volátil que se auto-poda (o que estabiliza vira ADR/glossary/CLAUDE.md/TESTING e sai daqui). Puxe quando for mexer numa área com histórico de armadilha, ou antes de tomar uma decisão que já esbarrou num gotcha registrado.
alwaysApply: false
---

# LESSONS — Aprendizados & gotchas

> **Área de staging, não cemitério.** Registra o que se aprende na marra: quirks de biblioteca,
> armadilhas de ambiente, suposições que quebraram. É **volátil** — diferente do **ADR** (decisão
> durável) e do **STATE** (o que estamos fazendo agora). A lição que **estabiliza** é **promovida**
> e **removida** daqui (ver poda abaixo). Se este arquivo cresce sem parar, a poda não está rolando.

## Como usar
- **Captura inline (na hora):** ao corrigir um erro não-óbvio, quebrar uma suposição ou descobrir
  um gotcha, adicione **1 linha aqui na hora** — não espere o handoff (o detalhe some).
- **Consolidação (ao pausar):** revise as lições da sessão: alguma duplicada?
  alguma já estabilizou → **promova e remova**.

### Poda — para onde a lição vai quando amadurece
| A lição virou… | Vai para | Sai daqui |
|---|---|---|
| Decisão difícil de reverter | ADR (`docs/architecture/adr/`) | ✅ |
| Termo/conceito de negócio | `docs/glossary.md` | ✅ |
| Convenção de código/agente | `CLAUDE.md` | ✅ |
| Padrão de teste/quality gate | `docs/engineering/TESTING.md` | ✅ |
| Gotcha que ainda não estabilizou | **fica aqui** | — |

## Aprendizados ativos
> Formato: `- <YYYY-MM-DD> · <área/arquivo> · o gotcha em 1 linha · como evitar/mitigar`.
> Mantenha acionável e curto. Se não é acionável, não é uma lição — é desabafo.

- <YYYY-MM-DD> · <área> · <o que mordeu> · <como não morder de novo>
- 2026-08-26 · backend/eslint.config.mjs · `import/no-cycle` passa em silêncio (falso verde) em projeto TS sem `import/extensions`+`import/parsers` — o plugin ignora arquivos `.ts` ao percorrer o grafo · espalhe `...importPlugin.flatConfigs.typescript.settings` no bloco e valide com um ciclo proposital antes de confiar no gate
- 2026-08-26 · backend/tsconfig.json · alias `@` apontando para `src/index.ts` (com extensão) faz `nest build` emitir `require("./index.ts")` e o `dist/` não sobe · aponte para `src/index` sem extensão
- 2026-08-26 · backend/tsconfig.json · `nest build` reescreve o `tsconfig.json` (injeta `baseUrl` e remove comentários) · não use comentário lá e confira `git diff tsconfig.json` depois de buildar
- 2026-08-26 · fluxo antigo de modelagem · havia conflito sobre modelar antes da spec aprovada; no ecossistema v2 `spec-engineer` fecha comportamento primeiro e `domain-modeler` só recebe a spec aprovada.
- 2026-08-26 · backend/src/main.ts · NestJS não carrega `.env` sozinho (não há `@nestjs/config` aqui), então `npm run start`/`start:dev` subiam sem `DATABASE_URL` mesmo com `.env` correto no disco — só funcionava com `node --env-file=.env` na mão · chame `loadDotEnvFile()` (wrapper de `process.loadEnvFile()`, stdlib) no topo do `bootstrap()`, tolerando `ENOENT` (em produção a plataforma injeta as variáveis) e propagando qualquer outro erro
- 2026-08-26 · backend/tsconfig.json · sem `rootDir` o `tsc` infere a raiz comum dos arquivos e emite `dist/src/main.js`, quebrando o `start:prod` (`node dist/main`) do template do Nest · fixe `"rootDir": "./src"` para o `dist/` espelhar `src/` na raiz
- 2026-08-26 · jest + `process.loadEnvFile` · jest isola `process.env` por suíte, então o efeito do load **não** é observável no teste (assert vira `undefined`) · teste só o tratamento de erro do wrapper; prove o carregamento de verdade subindo o app sem `--env-file`
- 2026-08-26 · agentes de código em paralelo · rodar `backend-engineer`/`frontend-engineer` em paralelo sem `isolation: "worktree"` faz os dois compartilharem a mesma árvore/branch do git e colidirem commits · sempre usar `isolation: "worktree"` ao paralelizar agentes que fazem `git checkout -b`/commit

## Promovidas (histórico curto)
> Rastro de para onde foram as lições podadas — só o link, sem reexplicar. Poda este histórico também.
- <YYYY-MM-DD: "<lição>" → [ADR-NNNN](architecture/adr/NNNN-*.md) / glossary / CLAUDE.md>
