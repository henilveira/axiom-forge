# ⚒️ create-axiom-forge

O gerador npm do [Axiom Forge](https://github.com/henilveira/axiom-forge): crie um projeto neutro com Spec-Driven Development, biblioteca de Produto, agentes especialistas, uma stack compatível e a infraestrutura local necessária.

<div align="center">

```bash
npx create-axiom-forge meu-projeto
```

**Shape the stack. Ship the hypothesis.**

</div>

## O que este pacote faz

O pacote cria um projeto derivado sem regra de negócio. Você escolhe:

- escopo: frontend + backend, somente frontend ou somente backend;
- agentes: Claude, Codex ou os dois;
- stack de frontend e seu system design;
- stack de backend e seu system design;
- arquitetura de integração;
- banco de dados;
- broker, quando necessário;
- provider alvo;
- template opcional de autenticação.

O resultado é um scaffold acompanhado do contexto operacional correto para os agentes trabalharem na stack selecionada.

Para conhecer o ecossistema inteiro, veja o [README principal](https://github.com/henilveira/axiom-forge#readme).

## Uso rápido

### Modo interativo

```bash
npx create-axiom-forge meu-projeto
```

O nome é obrigatório. A CLI Ink abre a experiência FORGE, apresenta os menus e impede combinações incompatíveis.

Depois da geração:

```bash
cd meu-projeto
cp .env.example .env
docker compose up -d       # somente se o perfil tiver banco/broker
/kickoff
```

`/kickoff` é um comando da ferramenta de agentes, executado na conversa dentro da raiz do projeto; não é um comando do shell.

### Modo determinístico

Para automação, CI ou scripts, use `--yes` e informe o perfil com flags:

```bash
npx --yes create-axiom-forge meu-projeto \
  --agents both \
  --mode full \
  --frontend nextjs \
  --frontend-design next-app-router \
  --backend nestjs \
  --backend-design nest-modular \
  --architecture event-driven \
  --database postgres \
  --broker rabbitmq \
  --provider local \
  --auth axiom-foundation
```

O gerador não sobrescreve o diretório do projeto. Se a pasta já existir, ele encerra com erro para proteger o conteúdo existente.

## A CLI Ink

Sem flags, a interface oferece:

```text
AGENT BAY       Claude · Codex · Claude + Codex
SCOPE           Frontend + Backend · só Frontend · só Backend
FRONTEND        Next · Vite/React · Vite/Vue · Angular · SvelteKit
BACKEND         NestJS · Express · FastAPI · Go · Spring · ASP.NET
ARCHITECTURE    modular · layered · microservices · EDA · serverless
DATABASE        none · PostgreSQL · MySQL · MongoDB · SQLite
BROKER          none · RabbitMQ · Kafka · NATS · Redis Streams
PROVIDER        local · AWS · Azure · GCP · Vercel · Cloudflare
AUTH            none · Axiom Auth Foundation, quando compatível
```

A UI usa setas para navegar, Enter para confirmar e números para seleção rápida. A tela de geração mostra o perfil escolhido e termina com o caminho criado.

## Opções e defaults

| Flag | Valores |
|---|---|
| `--agents` | `claude`, `codex`, `both` |
| `--mode` | `full`, `frontend`, `backend` |
| `--frontend` | `nextjs`, `vite-react`, `vite-vue`, `angular`, `sveltekit` |
| `--frontend-design` | designs compatíveis com o frontend |
| `--backend` | `nestjs`, `express`, `fastapi`, `go-gin`, `spring-boot`, `aspnet-core` |
| `--backend-design` | designs compatíveis com o backend |
| `--architecture` | `modular-monolith`, `layered-monolith`, `microservices`, `event-driven`, `serverless` |
| `--database` | `none`, `postgres`, `mysql`, `mongodb`, `sqlite` |
| `--broker` | `none`, `rabbitmq`, `kafka`, `nats`, `redis-streams` |
| `--provider` | `local`, `aws`, `azure`, `gcp`, `vercel`, `cloudflare` |
| `--auth` | `none`, `axiom-foundation` |
| `--catalog` | imprime o catálogo e encerra |
| `--path` | define a pasta-pai de saída |
| `-y`, `--yes` | desativa o wizard interativo |
| `-h`, `--help` | mostra a ajuda |

Quando `--yes` é usado, os defaults são:

```text
agents       = both
mode         = full
frontend     = nextjs
backend      = nestjs
architecture = modular-monolith
database     = none
broker       = none (rabbitmq para EDA)
provider     = local
auth         = none
```

Consulte o catálogo atual:

```bash
npx --yes create-axiom-forge --catalog
```

## Compatibilidade importante

O catálogo não trata toda combinação como válida. Designs nativos ficam restritos à tecnologia que os suporta:

| Design | Stack |
|---|---|
| `next-app-router` | Next.js |
| `vue-composition` | Vite + Vue |
| `angular-standalone` | Angular |
| `sveltekit-runes` | SvelteKit |
| `nest-modular` | NestJS |
| `fastapi-router-service` | FastAPI |
| `go-standard-layout` | Go + Gin |
| `spring-modulith` | Spring Boot |
| `aspnet-clean` | ASP.NET Core |

Arquitetura `event-driven` exige um broker diferente de `none`. Providers `vercel` e `cloudflare` são frontend-only. Projetos somente frontend não geram banco nem broker.

## O que é gerado

```text
meu-projeto/
├── product/                  # discovery, hipóteses, PRDs, jornadas e specs
├── frontend/                 # se o escopo tiver frontend
├── backend/                  # se o escopo tiver backend
├── docs/                     # método, arquitetura, ADRs, estado e gates
├── .agents/                  # se Codex foi escolhido
├── .claude/                  # se Claude foi escolhido
├── .axiom/
│   └── stack-profile.json    # seleção completa + especialistas
├── .project-config.json      # nome e namespaces da infraestrutura
├── .env.example              # configuração comentada sem secrets
├── docker-compose.yml        # quando banco/broker foram selecionados
└── README.md
```

O runtime começa com uma composição técnica neutra e/ou `/health`, conforme o perfil. Ele não contém entidade de negócio, fluxo de produto, pricing, persona ou integração específica.

## Nome e namespaces locais

O nome alimenta a identidade da infraestrutura:

```text
Meu Produto → meu-produto

diretório            meu-produto/
Compose project      meu-produto
Postgres database    meu_produto
Postgres CI          meu_produto_ci
RabbitMQ vhost       /meu-produto-local
RabbitMQ exchange    meu-produto.events
```

O gerador normaliza acentos, separadores e caracteres fora do conjunto seguro. O nome exibido pode ter até 80 caracteres.

## Agentes

### Claude, Codex ou ambos

| Seleção | Conteúdo |
|---|---|
| `claude` | `.claude/agents`, `.claude/skills`, regras e hooks |
| `codex` | `.agents/skills`, `AGENTS.md` e scripts da camada |
| `both` | ambos, com paridade verificável |

### Especialistas por perfil

O gerador instala orientação específica para a stack, design, arquitetura, banco, broker e provider escolhidos. Assim, um agente recebe as convenções reais do projeto em vez de um contexto genérico que mistura tecnologias.

O `/kickoff` e o roster de Produto permanecem neutros e são instalados com a biblioteca de Produto vazia.

## Autenticação opcional

`axiom-foundation` só aparece no wizard quando o perfil é exatamente:

```text
full + nextjs + nestjs + postgres + rabbitmq + local
```

Ele reaproveita uma fundação técnica de cadastro, login, verificação de e-mail, magic link, sessões seguras, CSRF, rate limit, revogação, OIDC opcional, e-mail, outbox/inbox, Prisma e RabbitMQ.

Não há regra de negócio. O template não define organização, tenant, plano, persona, entidade de produto ou autorização específica do seu domínio.

Para qualquer outro perfil, use `--auth none` e implemente sua estratégia sob o contrato da stack escolhida.

## Exemplos de perfis

### Frontend-only com Vite + React

```bash
npx --yes create-axiom-forge portal-web \
  --agents codex \
  --mode frontend \
  --frontend vite-react \
  --frontend-design atomic-design \
  --provider vercel \
  --auth none
```

Gera somente `frontend/`, Produto, docs e skills Codex. Banco e broker ficam em `none`.

### Backend-only com Go e Kafka

```bash
npx --yes create-axiom-forge events-api \
  --agents both \
  --mode backend \
  --backend go-gin \
  --backend-design go-standard-layout \
  --architecture event-driven \
  --database postgres \
  --broker kafka \
  --provider local \
  --auth none
```

Gera `backend/`, Compose para Postgres/Kafka, specialist de Go, specialist de EDA e os dois dialetos de agentes.

### Perfil completo com auth

```bash
npx --yes create-axiom-forge app-base \
  --agents both \
  --mode full \
  --frontend nextjs \
  --frontend-design next-app-router \
  --backend nestjs \
  --backend-design nest-modular \
  --database postgres \
  --broker rabbitmq \
  --provider local \
  --auth axiom-foundation
```

## Desenvolvimento do pacote

Dentro deste repositório:

```bash
cd packages/create-axiom-forge
npm ci
npm test
npm run pack:check
```

O teste cobre normalização do nome, parsing de flags, launcher npm/npx, namespaces da infraestrutura, seleção de agentes, compatibilidade, geração customizada e escopos frontend-only/backend-only.

Para usar o pacote localmente sem publicá-lo:

```bash
node bin/create-axiom-forge.mjs playground --yes --path /tmp
```

Para inspecionar o tarball antes de publicar:

```bash
npm pack --dry-run
```

## Publicação

O pacote é público e possui `publishConfig.access = public`.

```bash
npm login
npm publish --access public
```

Se a conta exigir 2FA na publicação, use o fluxo de staged publishing do npm:

```bash
npx --yes npm@latest stage publish
npm stage list create-axiom-forge
npm stage approve <stage-id>
```

A aprovação publica a versão no registry depois da revisão e do 2FA. Nunca coloque token, senha ou código 2FA em issues, logs ou arquivos do projeto.

## Licença

O pacote e o repositório são distribuídos sob a [licença MIT](https://github.com/henilveira/axiom-forge/blob/main/LICENSE).
