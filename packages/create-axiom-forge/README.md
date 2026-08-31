# ⚒️ create-axiom-forge

> Gere um projeto novo com SDD, Next.js, NestJS, autenticação e a infraestrutura
> de agentes já montadas.

Este pacote transforma o Axiom Forge em um comando instalável. Ele copia um
template completo, remove o dialeto de agentes que você não escolheu e adapta
os nomes da infraestrutura ao projeto.

## Uso

```bash
npx --yes create-axiom-forge meu-projeto
```

Ou:

```bash
npm create axiom-forge -- meu-projeto
```

O nome é obrigatório. Depois dele, o CLI apresenta o menu:

```text
Quais agentes instalar?
  1) Claude — instala skills e agentes Claude
  2) Codex — instala skills e instruções Codex
  3) Claude + Codex — instala os dois conjuntos
Escolha [1-3]:
```

Em automações, pule o menu:

```bash
npx create-axiom-forge meu-projeto --agents claude
npx create-axiom-forge meu-projeto --agents codex
npx create-axiom-forge meu-projeto --agents both
```

O diretório de saída pode ser controlado com `--path`:

```bash
npx create-axiom-forge meu-projeto --agents both --path ~/projetos
```

## O que é gerado

```text
meu-projeto/
├── product/       # discovery, hipóteses, PRDs, histórias e specs
├── frontend/      # Next.js, React, Zod, UI e proxy de autenticação
├── backend/       # NestJS, auth, Prisma, Postgres e RabbitMQ
├── docs/          # arquitetura, método, qualidade e estado
├── .agents/       # se Codex estiver instalado
├── .claude/       # se Claude estiver instalado
├── .env.example   # variáveis e secrets documentados
└── .project-config.json
```

O template é deliberadamente **domain-neutral**: não traz persona, mercado,
feature ou regra de negócio. A landing do Frontend é apenas um ponto de partida
visual.

## Nome → infraestrutura

O nome informado não é decorativo. Para `Meu Produto`, o gerador deriva:

| Destino | Valor |
|---|---|
| pasta | `meu-produto/` |
| Docker Compose | `meu-produto` |
| banco PostgreSQL | `meu_produto` |
| vhost RabbitMQ | `/meu-produto-local` |
| exchange RabbitMQ | `meu-produto.events` |
| banco de CI | `meu_produto_ci` |

Esses valores ficam registrados em `.project-config.json`.

## Depois de gerar

```bash
cd meu-projeto
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose -f backend/docker-compose.yml up -d
```

Depois, abra a conversa do projeto e execute:

```text
/kickoff
```

O kickoff oferece dois caminhos:

| Modo | Para quem é |
|---|---|
| 📌 Mercado conhecido | Você já tem ICP, problema e evidências de mercado |
| 🔎 Descoberta de hipóteses | Você ainda está explorando a ideia |

No segundo caminho, o agente pesquisa mercado, concorrentes, substitutos,
demanda, linguagem do público, jobs-to-be-done, modelos de negócio, tendências,
regulação e riscos. O resultado separa fato, inferência, hipótese e experimento
e grava tudo em `product/` como `DRAFT`.

## Opções

```text
Uso: npx create-axiom-forge <nome-do-projeto>

--agents claude|codex|both   seleciona os agentes sem abrir o menu
--path <diretório>           define o diretório pai de saída
-h, --help                   mostra a ajuda
```

## Desenvolvimento do pacote

```bash
npm test
npm run pack:check
```

O teste gera projetos temporários nos modos Claude-only e Codex-only e verifica
o namespacing de Postgres, Compose, RabbitMQ e CI.
