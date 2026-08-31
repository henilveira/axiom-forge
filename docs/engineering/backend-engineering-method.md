---
name: backend-engineering-method
description: Método prescritivo para iniciar, implementar e provar uma task backend NestJS/Prisma/DDD.
alwaysApply: false
---

# Método backend

Este documento é o procedimento dos agentes backend. O backend protege o domínio e a autorização;
NestJS, Prisma e HTTP são detalhes nas bordas. Não crie uma camada
porque o arquivo atual ficou grande.

## 1. Pré-voo obrigatório

Antes de editar:

1. Leia `AGENTS.md`, `CLAUDE.md`, ADRs, glossary e `docs/STATE.md`.
2. Confirme `spec.md` aprovado e leia `logic.md`, `domain.md`, `design.md`, `tasks.md` e a task.
3. Identifique bounded context, aggregate root, invariantes, AC/BR, tenant, auth, erros e efeitos.
4. Mapeie os consumidores: endpoint, query, projection, evento, job, frontend e testes.
5. Rode `rg --files backend/src` e procure equivalente antes de criar pasta/abstração.
6. Liste arquivos permitidos e proibidos no handoff; crie worktree própria se for escritor.

Se não consegue desenhar o fluxo `request → use case → aggregate/port → adapter → response`, não
comece a implementação; devolva ao `tech-lead`.

## 2. Árvore canônica

```text
backend/src/modules/<feature>/
  domain/
    aggregates/ entities/ value-objects/ events/ errors/ ports/
  application/
    use-cases/ policies/ ports/ dto/
  infrastructure/
    persistence/ adapters/ config/
  interfaces/
    http/ openapi/ filters/
  index.ts
backend/test/
  unit/ integration/ contract/ e2e/
  test-kit/{builders,fixtures,mocks,assertions}/
```

Dependência permitida: `interfaces → application → domain ← infrastructure`. Imports entre camadas
do backend são relativos; o barrel raiz é superfície externa, não atalho para criar ciclos.

## 3. Ordem de construção

### Passo A — contrato e assinatura

Defina nome da operação, input/output, erros, autorização, tenant e transação no `design.md`/task.
Crie primeiro a port/repository/gateway, tipos, DTO ou evento que a fronteira exige. A assinatura
deve ser pequena, específica do aggregate e independente de Prisma/Nest.

### Passo B — domínio puro

1. Crie VOs para normalização/invariantes locais (`Email`, `Slug`, `Token`, dinheiro, status).
2. Crie entidades filhas com identidade e operações restritas.
3. Crie eventos somente se o design os aprovou; payload é primitivo, serializável e versionado.
4. Crie aggregate root com factory/métodos de intenção; mudanças não acontecem por setter público.
5. Exponha coleções como read-only; referências a outro aggregate são IDs, não navegação mutável.
6. Injete `Clock`/gerador quando tempo ou aleatoriedade for parte da regra.
7. Escreva unit tests 1:1 para cada invariante, transição, erro, replay e caso limite.

Domínio não importa Nest, Prisma, HTTP, logger, SDK, config, `Date.now()` ou `process.env`.

### Passo C — application/use case

O use case coordena, não decide o estado interno do aggregate:

1. recebe command/input já tipado;
2. obtém identidade e tenant do contexto confiável;
3. verifica policy/autorização e pré-condições externas;
4. carrega o aggregate pela port correta;
5. invoca método de intenção do aggregate;
6. persiste pela port dentro da fronteira transacional;
7. publica/agendada efeitos por gateway explícito, após commit quando aplicável;
8. converte falhas em erro de aplicação estável;
9. retorna output público, nunca modelo Prisma.

Validators validam forma; policies validam autorização; o aggregate valida invariantes. Não duplique
uma regra em três lugares para “garantir”.

### Passo D — persistência e adapters

1. Implemente port específica do aggregate em `infrastructure/persistence`.
2. Mapeie domain ↔ Prisma explicitamente em funções separadas; DTO/Prisma não atravessa a port.
3. Atualize `schema.prisma`, índices, unique, nullability, tenant key e expected version se necessário.
4. Escreva migration revisável, backfill e rollback; não use reset nem SQL destrutivo sem aprovação.
5. Mantenha transação curta; nunca faça rede/LLM/email dentro dela.
6. Para read-modify-write, use constraint/expected-version/OCC e traduza conflito para erro estável.
7. Teste integração com Postgres controlado para isolamento tenant, índice, rollback e concorrência.

### Passo E — composição e HTTP

1. Registre tokens explícitos no módulo; genéricos abertos têm registro explícito.
2. Não construa container paralelo nem instancie `PrismaClient` em regra.
3. Controller/adapter valida DTO, extrai contexto, chama application port e mapeia resposta/erro.
4. Rotas são constantes; DTO request/response são separados da entidade.
5. OpenAPI declara OperationId, auth, sucesso, cada erro possível, nullable e exemplos.
6. Filtro central converte erros tipados; não repita `try/catch` em cada endpoint.
7. Contract tests provam payload, status, header, auth e cross-tenant.

## 4. Efeitos e confiabilidade

- Email, mensagem, job externo e LLM passam por port de application e possuem idempotency key.
- Retry tem limite, backoff e classificação de erro; não repita operação não idempotente às cegas.
- Eventos cross-context não carregam entidade nem segredo; documente consumidor, versão e replay.
- Logs são estruturados, com correlation/trace id e ação/resultado; nunca Authorization, cookie,
  senha, refresh token, convite bruto ou PII desnecessária.
- Configuração é validada no boot; segredo vem de ambiente/secret manager e não de migration.

## 5. Testes por risco

| Risco | Teste obrigatório |
|---|---|
| invariante/transição | unit puro do aggregate |
| autorização/tenant | unit da policy + integration/contract cross-tenant |
| port/use case | unit com fake determinístico |
| Prisma/migration | integration com banco controlado |
| request/response | contract HTTP/OpenAPI |
| evento/retry/idempotência | integration com publisher fake/consumer controlado |
| fluxo completo | E2E quando o AC for navegável |

Um teste que só verifica que o mock foi chamado não prova a regra. Remova o mock: se a lógica ainda
ficar verde mesmo quebrada, o teste é falso positivo.

## 6. Sinais de bloqueio

Bloqueie por: regra no controller/DTO/repository; Prisma no application/domain; `findFirst` sem
política de ausência; `First` sem erro tipado; coleção mutável; `any`; cast de payload; relógio
global; migration sem índice/tenant/backfill; efeito externo dentro da transação; log sensível;
DI duplicado; evento sem versão; endpoint sem contract test; ou task que altera arquivo proibido.

## 7. Gate e handoff

Rode o comando da task, `prisma validate`, typecheck, lint, build e testes aplicáveis. Informe:
arquivos, port/implementação, AC/BR→teste, migration/OCC, auth/tenant, eventos/efeitos, comandos,
resultados, risco/rollback, `SPEC_DEVIATION`/`OPEN-REQ` e próximo papel. Entregue para `tech-lead`
publicar o contrato real e para `test-engineer` validar a fatia somente com o gate verde.

## Fonte de método

A sequência segue o plano por camadas do backend deste boilerplate — Domain, Shared/contract, Application,
Persistence, Infrastructure e Web — para o stack NestJS/Prisma decidido nos ADRs da projeto derivado.
