---
name: agent-operating-contract
description: Contrato operacional comum para os agentes de engenharia deste boilerplate, baseado em fontes oficiais e decisões técnicas versionadas.
alwaysApply: false
---

# Contrato operacional dos agentes

Leia antes de planejar ou editar. A spec e os ADRs projeto derivado vencem padrões externos; este arquivo
define limites que não podem ficar implícitos nos prompts.

## Ordem de contexto

1. `AGENTS.md`, `CLAUDE.md`, `docs/STATE.md`, roadmap e ADRs.
2. `spec.md` — só implemente com `Status: approved`/`aprovado`.
3. `requirements.md`, `domain.md`, `design.md`, `tasks.md` e a delegação ativa.
4. `product/docs/glossary.md`, `backend/docs/integration/`, código adjacente e testes.
5. Referências visuais do projeto derivado, somente quando fornecidas e fixadas como read-only.

Conflito ou lacuna que mude comportamento vira `OPEN-REQ-*`/`SPEC_DEVIATION` e volta ao
`spec-engineer`, `domain-modeler` ou `tech-lead`. Não invente o “padrão usual”.

## Método antes do primeiro arquivo

Registre internamente AC/BR provado, bounded context, camada dona, consumidores, estados/erros,
concorrência, efeito externo e teste que falharia. Use `rg --files`/`rg` para localizar código
equivalente, barrels, schemas, ports, duplicações e consumidores. Leia `package.json` antes de
escolher comandos. Se não apontar o arquivo que prova o AC/BR, a task não está pronta.

## Linguagem e nomes

- Produto e documentos usam português; código usa identificadores ingleses do `product/docs/glossary.md`.
- Pastas/arquivos em `kebab-case`; classes/componentes/tipos em `PascalCase`; funções, variáveis e
  hooks em `camelCase`; constantes públicas em `SCREAMING_SNAKE_CASE`.
- Nomeie por domínio e responsabilidade (`create-user.use-case.ts`, `user.repository.ts`,
  `use-user-queries.ts`, `user-card.tsx`). Evite `utils.ts`, `helpers.ts`, `manager` e `common` sem
  owner explícito.
- Assinaturas/ports/schemas ficam separadas das implementações quando há fronteira ou substituição
  real; não crie interfaces artificiais. Retornos públicos têm tipo explícito; sem `any`/cast para
  contornar contrato.
- Um arquivo deve conter abstrações coesas. Componente acima de ~250 linhas ou função acima de
  ~80 linhas é sinal para avaliar extração, não uma regra mecânica de fragmentação.

## Backend: árvore e fronteiras

```text
backend/src/modules/<feature>/
  domain/{aggregates,entities,value-objects,events,errors,ports}/
  application/{use-cases,policies,ports,dto}/
  infrastructure/{persistence,adapters,config}/
  interfaces/{http,openapi,filters}/
  index.ts
backend/test/{unit,integration,contract,e2e,test-kit/{builders,fixtures,mocks,assertions}}/
```

Dependência: `interfaces → application → domain ← infrastructure`. Domínio não importa Nest,
Prisma, HTTP, SDK, logger ou relógio global. Application carrega agregado, autoriza, executa e usa
ports; infrastructure implementa ports e mapeia Prisma; interfaces traduz HTTP e delega.

Agregado é a fronteira de consistência: invariantes em factory/métodos de intenção, estado privado,
coleções read-only e eventos explícitos. Ausência, conflito, replay e unique têm erros tipados.
Efeitos irreversíveis (email, mensagem, LLM, job) passam por port de application, idempotency key,
retry limitado e observabilidade; nenhuma rede dentro de transação.

Repositories pertencem ao aggregate root, não a tabelas genéricas. Writes usam transação curta,
tenant scope e `version`/expected-version quando necessário. DI usa tokens explícitos e composição
no módulo. Configuração valida no boot; logs nunca expõem Authorization, cookies, tokens, senha ou
PII. Migration tem índice, nullabilidade, backfill e rollback documentados antes do endpoint.

## Frontend: árvore e fronteiras

```text
frontend/src/
  app/                         # rotas/layouts finos
  features/<feature>/
    contracts/{schemas,types,mappers}.ts
    services/*.ts
    queries/{query-options,queries}.ts
    mutations/*.ts
    forms/*.ts
    orchestration/*.tsx
    components/{ui,forms}/*.tsx
    tests/{unit,contract,e2e}/*
  routes/endpoints.ts
  index.ts
frontend/test/{unit,contract,e2e,fixtures,factories,mocks}/
```

Fluxo: `endpoints → Zod schemas → services → query/mutation → forms → orchestration → UI`. Zod é
fonte de tipos; `unknown` sempre passa por parse e mapper explícito. Service faz HTTP/serialização/
erro, nunca React/cache/toast. Query options centraliza keys/stale policy; mutation centraliza
invalidação/rollback/feedback; UI recebe props processadas e não busca dados. Server por padrão;
`use client` só na borda interativa. Preserve consistência visual por mapa tela→token→estado→componente.

## Testes, mocks e sinais de erro

`unit` prova domínio/application/schemas com fakes e clock determinístico; `integration` prova
Prisma/adapters/tenant/índice/transação/concorrência; `contract` prova request/response/status/
errors/auth/nullable; `e2e` prova o fluxo navegável com loading, vazio, erro e autorização. Fixtures,
builders e mocks ficam em `test-kit`/`test`; produção nunca importa mock e mock deve validar o mesmo
schema do service.

Bloqueie regra em controller/UI, import cruzado, barrel circular, `Date.now()` no domínio, `any`,
cast sem parse, component com fetch, service com toast, mutation sem rollback/invalidação, mock em
`src`, teste que só testa mock, log sensível, segredo ou migration destrutiva.

## Handoff e paridade

Retorne status, arquivos, AC/BR→testes, comandos/saídas, desvios, riscos, decisões/ADRs e próximo
owner. O orquestrador integra somente gate verde e atualiza tasks, contrato e STATE. Cada papel ativo
tem skill Codex e agente Claude de mesmo nome; Claude declara `model: sonnet`, nunca `opus`.
Valide com `python3 .agents/scripts/validate-agent-parity.py`.

## Referência técnica e pesquisa

As decisões devem ser reconciliadas com a documentação versionada deste
boilerplate e com fontes oficiais adequadas ao stack adotado. Referências do
projeto derivado são opcionais, read-only e não fazem parte deste pacote.
