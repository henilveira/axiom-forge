# projeto derivado Frontend — contrato de trabalho

Este diretório contém somente o squad Frontend: Next.js, React, TypeScript,
contratos Zod, services, queries/mutations, forms, composição, UI, acessibilidade,
testes, qualidade, segurança e release. Backend e Product vivem em `../backend`
e `../product`; não misture seus write-sets.

## Execução delegada e Git Flow

Toda task de código deve ser executada por um subagente em um worktree exclusivo
deste repositório. A `main` não recebe desenvolvimento direto. O Tech Lead
cria o DAG e usa branches `feature/<TASK-ID>-<slug>`, `fix/<TASK-ID>-<slug>`,
`chore/<TASK-ID>-<slug>`, `release/<version>` ou `hotfix/<slug>` conforme o fluxo. Cada
worktree tem um único owner e deve retornar branch, commit, arquivos, gates e
evidências.

No pré-voo, confirme `git rev-parse --show-toplevel` e valide que ele aponta
para a raiz do monorepo quando a task atravessar squads, ou para este diretório
quando a task for isolada do Frontend. Se o projeto não estiver configurado
como alvo de worktree, bloqueie a delegação; nunca use o checkout de outro writer.

Tasks independentes devem ser delegadas em paralelo, cada uma em sua própria
branch/worktree. Não paralelize quando houver arquivo compartilhado, incluindo
contratos, barrels, configuração, layouts, `STATE.md` ou documentação de
integração. A integração/merge é sequencial e passa pelo
`git-flow-specialist` do orquestrador via PR obrigatório; o
`frontend-release-engineer` só produz `release-ready`, e nenhum agente copia ou
aplica o patch de outro.

Leia [as convenções de código](docs/engineering/code-conventions.md) e
[as lições registradas](docs/lessons.md) antes de criar ou revisar código.

## Ordem obrigatória

Leia `docs/STATE.md`, `docs/engineering/frontend-cross-repo-consumption.md` e a
integração Backend fixada. Se o projeto derivado fornecer uma referência visual,
registre-a como insumo read-only separado. Confirme o estado real do Git e os
gates antes de alterar código.

## Fluxo de implementação

O `tech-lead` consome somente `../backend/docs/integration/<id>.md` quando o
campo for exatamente `status: APPROVED`, com
`backend_commit`, `spec_id`, `updated_at` e owner. A integração define os
contratos; o Frontend não inventa endpoints, payloads, estados ou eventos.

Quando o pedido for explicitamente `VISUAL-FIRST` (“visual first”, “100% visual”,
“sem backend agora” ou adaptação de uma referência visual fornecida pelo projeto derivado), o Tech Lead pode liberar UI antes do
backend com contrato `PROPOSED`. Nesse modo não se criam endpoints/services de
integração; componentes recebem props/view-models tipados e podem mudar quando o
contrato Backend→Frontend `REAL` for publicado.

Para aparência e comportamento visual, consulte somente o inventário e o commit
fixado de uma referência visual que o projeto derivado tenha fornecido. Esse
material é read-only: nunca é importado em runtime nem editado por este squad.

## Arquitetura não negociável

`schemas/types/constants → services → queries/mutations → forms/orchestration →
components/ui|client|forms|patterns|states`. “Contract” é um termo conceitual
para o contrato público exposto pelo barrel da feature; não é uma pasta para
misturar schema e type. Todo `unknown` externo é validado com Zod. UI não faz
fetch nem contém regra de negócio. Preserve acessibilidade, estados
loading/empty/error/success, autorização/tenant no contrato, testes e
observabilidade sem expor secrets, tokens ou PII.

É proibido usar comentários `eslint-disable`, `eslint-enable`, `@ts-ignore` ou
equivalentes para mascarar erro. Corrija o código ou proponha uma alteração
permanente e revisada na configuração do ESLint; supressão inline nunca é
exceção válida.

Constantes semânticas, políticas, limites, nomes de rotas/eventos, chaves e
configurações devem viver em arquivos `*.constants.ts`. Variáveis locais de
fluxo que apenas capturam resultados intermediários podem permanecer no método.
Pastas não devem ser planas quando misturam responsabilidades: agrupe por
responsabilidade coesa e mantenha barrels locais pequenos.

Validação no cliente serve somente para UX e feedback imediato. Identidade,
autorização, integridade e regras de negócio só são provadas no Backend. Zod
faz parsing seguro de `unknown` no cliente, mas não cria segurança nem substitui
as verificações do Backend.

## Eficiência e bloqueadores

Todos os agentes devem ler `docs/engineering/agent-efficiency-protocol.md`. O
pré-voo confirma integração Backend `APPROVED`, referências visuais opcionais, dependências e
ambiente antes da escrita. Se faltar contrato, serviço, secret, domínio ou acesso,
pare e consulte o usuário com evidência, opções, procedimento e reversão,
perguntando se resolve agora ou fica em standby. Após correção, rode a prova
mínima e a suite afetada; o full gate ocorre uma vez no fechamento. Corrija
defeitos simples dentro dos próprios paths; delegue apenas mudanças que cruzem
camada, segurança, arquitetura, ownership, infraestrutura ou contrato.
