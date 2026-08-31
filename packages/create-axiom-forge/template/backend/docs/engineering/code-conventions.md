# Convenções de código do Backend

Estas regras são obrigatórias para NestJS, TypeScript, Prisma, EDA e adapters
RabbitMQ. Elas complementam o `AGENTS.md` e os gates do `eslint.config.mjs`.

## Trabalho isolado

Toda implementação é delegada a um subagente em worktree exclusiva, criada a
partir da `main` atualizada, com uma branch Git Flow por task:

- `feature/<TASK-ID>-<slug>` para comportamento novo;
- `fix/<TASK-ID>-<slug>` para correção;
- `chore/<TASK-ID>-<slug>` para manutenção de engenharia;
- `release/<version>` e `hotfix/<slug>` somente no fluxo de release.

O primeiro comando do subagente é `git rev-parse --show-toplevel`; o resultado
deve ser a raiz do `backend`. Projeto não registrado ou worktree do
meta-repositório não é fallback válido.

O Tech Lead pode executar tasks em paralelo somente quando não há dependência
nem arquivo compartilhado. Migrations, `schema.prisma`, barrels, configuração,
contratos, `tasks.md`, `STATE.md` e integração têm um único escritor. O retorno
da branch precisa conter commit, paths alterados, gates, testes, rollback e
bloqueios. Nenhum agente trabalha diretamente na `main`.

## ESLint sem atalhos

É proibido adicionar `eslint-disable`, `eslint-enable`, `@ts-ignore` ou
comentário equivalente para fazer o gate passar. Isso inclui supressões
parciais como `/* eslint-disable no-restricted-globals, eqeqeq */`.

Quando o lint falhar:

1. corrija a causa no design ou no código;
2. se a regra estiver errada para todo o repositório, proponha mudança
   permanente no `eslint.config.mjs`, com justificativa e revisão;
3. rode lint, typecheck, build e testes novamente.

Supressão local não é exceção válida. O quality/release gate deve procurar
essas diretivas e bloquear a branch se encontrar qualquer uma.

## Constantes

Constantes semânticas e reutilizáveis — políticas, limites, nomes de eventos,
routing keys, TTLs, nomes de cookies, códigos públicos e configurações — devem
ser declaradas em um arquivo `*.constants.ts` coeso, próximo da responsabilidade
que as usa. O nome segue `UPPER_SNAKE_CASE` quando for constante de módulo.

Uma variável local de fluxo que apenas captura um resultado intermediário não é
uma constante de domínio/configuração e pode permanecer no método. Não espalhe
valores mágicos: extraia-os para `*.constants.ts` e cubra-os com teste quando
afetarem comportamento.

## Pastas por responsabilidade

Não mantenha diretórios planos com arquivos de responsabilidades diferentes.
Crie subpastas quando um contexto crescer, com barrel local somente para
exports coesos. Em messaging, a forma preferida é:

```text
messaging/
  contracts/       # envelope e schemas de eventos
  outbox/          # store, relay e publicação transacional
  inbox/           # deduplicação e processamento
  rabbitmq/        # conexão, topology, confirms e adapters
  retry-dlq/       # política de retry e dead letter
  observability/   # logs, correlation e redaction
```

O mesmo princípio vale para `domain`, `application`, `interfaces` e
`persistence`: nomes devem explicar a responsabilidade. Não crie `common/`,
`utils/`, `helpers/`, `misc/` ou `manager` como depósito de arquivos.

## Gate de revisão

Uma task só está pronta quando o diff prova: branch/worktree isolada, imports e
camadas corretos, constantes no local correto, pastas coesas, zero supressões,
teste no mesmo ciclo e todos os comandos definidos no plano verdes.
