# Convenções de código do Frontend

Estas regras são obrigatórias para Next.js, React, TypeScript, schemas Zod,
composição e UI. Elas complementam o `AGENTS.md` e o `eslint.config.mjs`.

## Trabalho isolado

Toda implementação é delegada a um subagente em worktree exclusiva, criada a
partir da `main` atualizada, com uma branch Git Flow por task:

- `feature/<TASK-ID>-<slug>` para comportamento novo;
- `fix/<TASK-ID>-<slug>` para correção;
- `chore/<TASK-ID>-<slug>` para manutenção;
- `release/<version>` e `hotfix/<slug>` somente no fluxo de release.

O primeiro comando do subagente é `git rev-parse --show-toplevel`; o resultado
deve ser a raiz do `frontend`. Projeto não registrado ou worktree do
meta-repositório não é fallback válido.

Tasks sem dependência e sem arquivo compartilhado podem rodar em paralelo.
Contratos, barrels, configuração, layouts, `STATE.md` e integração têm um
único escritor sequencial. Nenhum agente trabalha diretamente na `main`.

## ESLint sem atalhos

É proibido adicionar `eslint-disable`, `eslint-enable`, `@ts-ignore` ou
comentário equivalente. O `eslint.config.mjs` usa `noInlineConfig` para impedir
supressão local. Corrija a causa no componente, contrato ou arquitetura; uma
mudança de regra deve ser permanente, justificada e revisada.

## Constantes

Constantes semânticas e reutilizáveis — tokens, variantes, breakpoints, limites,
nomes de contrato, rotas, chaves e configurações — devem ser declaradas em um
arquivo `*.constants.ts` coeso, próximo da responsabilidade. Variáveis locais
que apenas capturam resultados intermediários podem permanecer no método.

## Pastas por responsabilidade

Não mantenha uma feature plana. Preserve a sequência e separe responsabilidades:

```text
src/features/<feature>/
  schemas/         # parsing Zod de dados externos
  types/           # tipos públicos e derivados do contrato
  constants/       # limites, tokens e nomes semânticos
  services/        # transporte e mapeamento de erro
  queries/         # leitura/cache
  mutations/       # escrita/invalidação
  forms/           # validação e composição de formulário
  orchestration/   # coordenação da jornada
  components/
    ui/             # componentes puros e reutilizáveis
    client/         # adaptadores client-side, sem acesso a dados
    forms/          # componentes de formulário, sem acesso a dados
    patterns/       # composições visuais
    states/         # estados visuais
```

Quando uma pasta crescer, crie subpastas coesas como `components/primitives`,
`components/patterns`, `components/states` ou `services/auth`, mantendo o
barrel `index.ts` em cada pasta de código. Arquivos `*.props.ts` ficam junto do
componente em `components/ui`, `components/client`, `components/forms`,
`components/patterns` ou `components/states`. Use barrels locais pequenos e
não crie `contracts/` como depósito misto, nem `common/`, `utils/`, `helpers/`
ou `misc/` como depósito.

“Contract” permanece um termo conceitual para a superfície pública de uma
feature (schemas + types + exports do barrel). O gate estrutural e o lint
exigem a separação física entre `schemas/` e `types/`.

Validação no cliente é apenas UX/feedback. Identidade, autorização,
integridade e regras de negócio só são provadas no Backend; Zod faz parsing de
`unknown`, mas não cria segurança no cliente.

## Gate de revisão

Uma task só está pronta quando o diff prova branch/worktree isolada, contrato
validado com Zod, constantes no local correto, pastas coerentes, zero
supressões, estados loading/empty/error/success cobertos e lint/typecheck/build/
testes/acessibilidade verdes.

`eslint-import-resolver-typescript` existe somente para que
`import/no-unresolved` valide os aliases reais definidos no `tsconfig.json`;
não é usado para abrir exceções de resolução.
