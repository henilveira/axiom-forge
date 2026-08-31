---
name: visual-first
description: "Ativa o modo VISUAL-FIRST para construir páginas e componentes frontend 100% visuais, inclusive traduzidos do referência externa, sem integração backend agora; detecte pedidos como visual first, sem backend neste momento, protótipo de UI ou copiar do legado."
---

# VISUAL-FIRST — frontend visual preparado para integração futura

Use este modo quando a intenção do usuário for adiantar a experiência frontend sem
consumir ou implementar o backend ainda. `VISUAL-FIRST` é um modo de execução do
Tech Lead, não um novo agente nem uma autorização para inventar comportamento de
produto.

## Detecção e limite

Ative por linguagem natural em português ou inglês quando o pedido disser, por
exemplo, “visual first”, “100% visual”, “sem integração com backend agora”,
“protótipo de UI”, “construir a página antes do backend” ou “copiar/adaptar o
componente do referência externa”. Uma indicação explícita do usuário vence inferências.

Não use este modo se o pedido exigir endpoint, autenticação/autorização real,
persistência, contrato backend `REAL`, integração E2E real ou regra de domínio.
Nesse caso, mude para `FULL` ou separe a parte visual da integração e registre o
gap como `BACKEND_NEEDED`/`OPEN-REQ`.

## Decisão do Tech Lead

Registre no DAG `mode: VISUAL-FIRST`, o objetivo visual, paths, referência do
referência externa, estados obrigatórios e contrato futuro como `PROPOSED`. Delegue somente
os owners de frontend existentes:

- `frontend-ui-engineer`: primitives, tokens, componentes puros, estados visuais,
  acessibilidade e paridade com o referência externa;
- `frontend-engineer`: feature, view-models, props/callbacks, composição,
  orchestration local e fronteiras que receberão dados no futuro;
- `test-engineer`: testes de interação, acessibilidade, estados e screenshot/
  visual regression quando houver ferramenta aprovada;
- `quality-engineer`/`security-reviewer`: revisão estrutural, hydration,
  exposição indevida de dados, validação de entradas e claims de segurança;
- `release-engineer` → PR/aprovação humana → `git-flow-specialist`: os mesmos
  gates de entrega de qualquer feature.

UI e composição podem ser paralelas somente depois de props/view-models e write-
sets estarem definidos. Componentes compartilhados, barrels, configuração,
contrato proposto, STATE e integração continuam sequenciais com um único writer.

## Implementação visual

- Trabalhe na feature existente e na árvore frontend canônica. Use RSC por
  padrão, `'use client'` apenas na menor folha interativa e componentes com
  responsabilidade única.
- Componentes recebem props primitivas, callbacks tipados ou um view-model
  explícito; não recebem entidade/API crua. Separe `components/ui`,
  `components/client`, `components/forms`, `components/patterns`, `components/states`
  e `orchestration` conforme a responsabilidade.
- Prepare loading, error, empty, disabled, permission, pending/syncing e estados
  responsivos como apresentação. Não declare sucesso, autorização ou persistência
  que ainda não foram confirmados pelo backend.
- Se houver formulário ou entrada do usuário, use Zod para feedback e parsing de
  `unknown` no frontend. Isso é validação de UX, não prova de autorização,
  tenant isolation, integridade ou regra de negócio do servidor.
- Não crie fetch, endpoint, service, query, mutation, cache, autenticação,
  segredo ou regra de domínio para “simular” a integração. Use estado local,
  fixture ou adapter de preview somente fora da produção e deixe claro que é
  `PROPOSED`; não esconda fixture dentro da UI nem a apresente como contrato real.
- Se o usuário pedir cópia do referência externa, inspecione a referência visual read-only adicionada pelo projeto derivado,
  faça o mapa `tela → token/primitive → estado → componente`, reutilize tokens e
  traduza a estrutura. Nunca copie `any`, fetch, regra de negócio ou acoplamento.

## Preparação para o backend

Mantenha a fronteira de dados pronta sem prometer estabilidade artificial:

1. documente props, view-model, estados, nullabilidade e eventos esperados;
2. mantenha tipos/schemas propostos separados de fixtures e componentes;
3. centralize a troca futura no adapter/orchestration, não em cada componente;
4. entregue ao Tech Lead as hipóteses, gaps e pontos que provavelmente mudarão
   quando o contrato Backend→Frontend `REAL` existir.

Quando o backend entregar a integração, compare `PROPOSED` com `REAL` no
`docs/integration/<fase>.md`. É esperado adaptar schemas, mappers, view-models,
orchestration e estados quando o contrato real exigir; preserve a UI apenas onde
ela continuar compatível e registre toda divergência. Nunca force o backend a
imitar o mock nem ajuste o frontend silenciosamente.

## Gate e entrega

Rode primeiro a prova afetada: typecheck/lint da feature, testes de interação e
acessibilidade, estados visuais e screenshot quando aplicável. No fechamento,
execute os gates frontend completos definidos pelo repositório; não invente um
gate backend inexistente. Handoff deve incluir `mode`, paths, mapa do referência externa,
contrato `PROPOSED`, fixtures/adapter, estados, AC/BR→teste→evidência, riscos,
gaps para `REAL` e mudanças esperadas na integração.

Use branch/worktree exclusiva. Commits seguem a política de PR: branch temporária,
PR para `main`, aprovação humana no HEAD atual, checks verdes, merge no GitHub e
cleanup somente após o merge. Não faça commit/push direto em `main`, merge local,
rebase para simular revisão ou bypass de segurança.
