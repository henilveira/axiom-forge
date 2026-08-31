# projeto derivado Backend — contrato de trabalho

Este diretório contém somente o squad Backend: NestJS, TypeScript, Prisma,
Postgres, RabbitMQ, EDA, testes, segurança, qualidade e release. Product e
Frontend vivem em `../product` e `../frontend`; não misture seus write-sets.

## Execução delegada e Git Flow

Toda task de código deve ser executada por um subagente em um worktree exclusivo
deste repositório. A `main` não recebe desenvolvimento direto. O Tech Lead
cria o DAG e usa branches `feature/<TASK-ID>-<slug>`, `fix/<TASK-ID>-<slug>`,
`chore/<TASK-ID>-<slug>`, `release/<version>` ou `hotfix/<slug>` conforme o fluxo. Cada
worktree tem um único owner e deve retornar branch, commit, arquivos, gates e
evidências.

No pré-voo, confirme `git rev-parse --show-toplevel` e valide que ele aponta
para a raiz do monorepo quando a task atravessar squads, ou para este diretório
quando a task for isolada do Backend. Se o projeto não estiver configurado como
alvo de worktree, bloqueie a delegação; nunca use o checkout de outro writer.

Tasks independentes devem ser delegadas em paralelo, cada uma em sua própria
branch/worktree. Não paralelize quando houver arquivo compartilhado, incluindo
`schema.prisma`, migrations, barrels, configuração, contratos, `tasks.md`,
`STATE.md` ou documentação de integração. A integração/merge é sequencial e
passa pelo `git-flow-specialist` do orquestrador via PR obrigatório; o
`release-engineer` só produz `release-ready`, e nenhum agente copia ou aplica o
patch de outro.

Leia também [as convenções de código](docs/engineering/code-conventions.md) e
[as lições registradas](docs/lessons.md) antes de criar ou revisar código.

## Ordem obrigatória de leitura

Leia `docs/STATE.md`, `docs/engineering/cross-repo-reader.md`, o `AGENTS.md` da
ref do Product, a spec aprovada e as ADRs aplicáveis. Confirme o estado real do
Git, a ref exata do Product e os testes antes de alterar código.

## Fluxo

O Product publica um pacote versionado em `specs/<EPIC>/<STORY>` e a skill
externa `.agents/skills/spec-reader/SKILL.md`. O `tech-lead` lê essa skill na
ref fixada, valida o manifest e gera o plano em
`docs/implementation/<spec-id>/implementation-plan.md`. Só depois os owners
implementam. O Backend publica `docs/integration/<integration-id>.md` e seu
manifest; o Frontend só consome integração com `status: APPROVED`.

## Arquitetura não negociável

`interfaces → application → domain ← infrastructure`. O domínio não importa
NestJS, Prisma, RabbitMQ, logger, SDK, I/O ou relógio global. Efeitos passam por
ports da application. Eventos usam envelope versionado, RabbitMQ, outbox,
idempotência, retry e DLQ. Toda publicação, consumo, retry, rejeição e DLQ
produz log estruturado de metadados; payloads, tokens e PII não entram em logs.

## Regras de mudança

Só implemente spec com `status: APPROVED`. Não faça migration destrutiva, não
adicione dependência sem aprovação, não use `any`/casts para esconder contrato,
não misture squads e não publique contrato de integração incompleto. Teste
lógica não trivial no mesmo ciclo e não avance com lint, typecheck, build ou
testes vermelhos.

É proibido usar comentários `eslint-disable`, `eslint-enable` ou equivalentes
para mascarar erro, inclusive `no-restricted-globals` e `eqeqeq`. Corrija o
design/código ou proponha uma alteração permanente e revisada na configuração
do ESLint; supressão inline nunca é uma exceção válida.

Constantes semânticas, políticas, limites, nomes de evento, routing keys e
configurações devem viver em arquivos `*.constants.ts`. Variáveis locais de
fluxo que não representam uma constante reutilizável podem permanecer no
método. Pastas não devem ser planas quando misturam responsabilidades:
agruppe por responsabilidade coesa (por exemplo, `messaging/contracts`,
`messaging/outbox`, `messaging/inbox`, `messaging/rabbitmq` e
`messaging/observability`) e mantenha barrels locais pequenos.

## Eficiência e bloqueadores

Todos os agentes devem ler `docs/engineering/agent-efficiency-protocol.md`. O
pré-voo detecta serviços, secrets, acesso e decisões externas antes da escrita.
Ao faltar algo, pare e consulte o usuário com evidência, opções, procedimento,
risco e reversão, perguntando se resolve agora ou fica em standby. Depois de uma
correção, rode a prova mínima e a suite afetada; o full gate ocorre uma vez no
fechamento. Defeitos simples dentro dos paths do agente são corrigidos por ele;
delegações ficam para mudanças cross-layer, segurança, arquitetura, ownership ou
infraestrutura.
