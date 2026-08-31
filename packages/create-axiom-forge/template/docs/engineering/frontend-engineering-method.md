---
name: frontend-engineering-method
description: Método prescritivo para iniciar, compor, testar e revisar uma feature Next.js/React sem quebrar contrato ou paridade visual.
alwaysApply: false
---

# Método frontend

O frontend não inventa domínio nem compensa backend ausente com regra duplicada. Ele protege a
fronteira de dados, compõe a experiência e mantém uma UI consistente com código reutilizável.

## 1. Pré-voo obrigatório

1. Leia `AGENTS.md`, `CLAUDE.md`, ADRs, glossary, `docs/STATE.md` e a task.
2. Confirme `spec.md` aprovado, `domain.md`, `design.md` e contrato
   `docs/integration/<fase>.md` como `REAL` ou `PROPOSED`.
3. Identifique a feature dona; estenda-a antes de criar `src/features/<outra-pasta>`.
4. Inspecione `src/routes/endpoints.ts`, schemas, services, hooks, barrels, primitives e testes.
5. Faça o mapa visual `tela → primitive/token → estado → componente Next` antes de JSX.
6. Declare arquivos permitidos/proibidos e modo `FULL` ou `VISUAL-FIRST` no plano.

Se endpoint, campo, estado ou regra estiver ambíguo, pare e abra `BACKEND_NEEDED`/`OPEN-REQ`; não
chute shape para destravar a tela.

## 2. Árvore canônica de feature

```text
frontend/src/
  app/                         # rotas/layouts/pages finos
  routes/endpoints.ts          # paths parametrizados
  features/<feature>/
    contracts/                 # schemas Zod e contratos públicos
    server/{services,types}/   # HTTP, parse, mapper e tipos inferidos
    hooks/{queries,mutations,forms,components,utils}/
    components/{ui,forms}/
    lib/ constants/ README.md index.ts
test/{unit,contract,e2e,fixtures,factories,mocks}/
```

Todo diretório relevante possui `index.ts`. Entre features/shared use o barrel/alias público
definido pelo projeto; não esconda deep import longo. Identificadores internos seguem glossary em
inglês; texto visual segue idioma do produto.

## 3. Ordem de construção contract-first

### Passo A — endpoint registry

Comece por `src/routes/endpoints.ts`. Rotas parametrizadas são funções; não espalhe URL literal em
service, hook ou componente. O endpoint descreve endereço, não autorização ou regra de negócio.

### Passo B — schemas e tipos

Crie response, create, update, filtros e error schemas em arquivos coesos. `z.infer` é a única fonte
de tipos; `null` e `optional` têm semântica diferente. Valide datas e enums explicitamente.
`unknown → schema.parse → mapper → modelo interno` é o caminho obrigatório.

### Passo C — services

Service usa `fetcher`/cliente configurado, endpoint, schema e mapper; retorna modelo interno ou
`void` fiel ao contrato. Não importa React, Query, toast, componente ou regra de UX. Erro técnico
é preservado/classificado, não engolido por fallback silencioso.

### Passo D — query options e queries

1. Crie `hooks/queries/query-options.ts` antes de `useQuery`.
2. Defina keys hierárquicas (`all`, `lists`, `details`, `detail(id)`) e não recrie key inline.
3. Justifique `enabled`, `staleTime`, `select`, prefetch e hidratação pela semântica do dado.
4. Hook de query chama apenas query-options; componente nunca chama service diretamente.

### Passo E — mutations

1. Uma mutation por ação explícita em `hooks/mutations/` com shape de parâmetros previsível.
2. Centralize `invalidateQueries` ou `refetchQueries` conforme a necessidade de reconciliação.
3. Se otimista: cancelar query, snapshot, update, rollback em erro e reconciliação final.
4. Mostre feedback de sucesso e erro; não deixe `onError` vazio nem erro silencioso.
5. Use `mutateAsync` apenas quando o fluxo precisa fechar, navegar, resetar ou encadear.

### Passo F — forms

Schema de request guia `react-hook-form`; schema de response não vira schema de edição. O form hook
cuida de defaults, resolver, create/update, reset e payload; `components/forms` só renderiza campos,
erros e estado de submit. Form hook não renderiza JSX e não faz fetch direto.

### Passo G — UI e orchestration

1. Reuse primitive/token existente; só crie shared component com busca e justificativa registrada.
2. `components/ui` recebe props prontas, callbacks e estado visual local; é puro e acessível.
3. `components/` e `hooks/components/` conectam query, mutation, form, router, context e estados.
4. Page App Router é fina: decide composição/route params, não concentra regra de domínio.
5. Toda leitura trata loading, error, empty, success, disabled, permissão e responsividade.

## 4. Modos de contrato

### `FULL`

Contrato backend `REAL`: schemas refletem response existente; service testa parse; nenhuma hipótese
chega à UI. Divergência vira gap para backend/Tech Lead, não ajuste silencioso no componente.

### `VISUAL-FIRST`

Contrato `PROPOSED`: schemas explicitam a hipótese, MSW simula latência/sucesso/erro e fixture usa o
mesmo schema. Quando backend chegar, trocar handler deve exigir zero alteração de UI/orchestration;
se exigir, contrato não foi combinado e deve voltar ao Tech Lead.

## 5. Estados e UX que não podem faltar

- Loading usa skeleton/placeholder coerente; nunca tela branca/congelada.
- Error informa ação de recuperação quando possível; nunca “500” para usuário.
- Empty explica o que fazer; não confunda ausência com falha.
- Submit desabilita double submit e mostra pending no controle acionado.
- Ação destrutiva pede confirmação acessível; nunca `window.confirm/alert/prompt`.
- Feedback usa a biblioteca aprovada e mensagens contextuais, sem PII ou jargão técnico.
- Componentes respeitam foco, teclado, labels, contraste, responsividade e tema existente.

## 6. Testes por risco

| Alteração | Evidência |
|---|---|
| schema/mapper/service | Jest: parse válido/inválido, nullability, erro e shape |
| query | Jest: key/options, `enabled`, select e stale policy |
| mutation | Jest: ação, invalidação/refetch, toast e rollback |
| form | Jest: defaults, reset, validação e payload create/update |
| UI/componente | interação, acessibilidade e estados async |
| página/fluxo | Playwright/E2E navegável, sucesso e erro |

Use os comandos reais encontrados no `package.json`; não declare “testado” sem executar. Mocks e
fixtures ficam fora de produção e não podem ser a única prova do comportamento.

## 7. Sinais de bloqueio

Bloqueie por: fetch/service em UI; query inline; mutation sem invalidação/erro; cast de API sem parse;
`any`; regra de autorização no cliente; token em `localStorage`; service misturando real/mock/fallback;
componente com centenas de linhas; primitive duplicada; rota literal; contrato `PROPOSED` apresentado
como real; ou visual diferente da referência aprovada sem decisão documentada.

## 8. Gate e handoff

Rode typecheck, lint, build, Jest e Playwright aplicável. Reporte modo, endpoint/schema/service,
query/mutation/form/UI, mapa de paridade, AC→teste, mock, cache/invalidação, comandos/resultados,
gaps e próximo papel. Entregue para `test-engineer`, `quality-engineer` e `tech-lead`.

## Fonte de método

A ordem adapta os arquivos `02-creating-a-feature`, `03-typescript-and-schemas`, `04-queries`,
`05-mutations`, `06-forms`, `07-components`, `09-testing` e `14-folder-contracts` do método
frontend deste boilerplate, preservando as decisões de aliases e barrels do projeto derivado.
