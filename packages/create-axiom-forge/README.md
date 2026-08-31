# ⚒️ create-axiom-forge

Gere um projeto neutro com SDD, biblioteca de Produto, agentes especialistas e
o runtime que você escolher. O pacote não carrega domínio nem regra de negócio.

## Uso rápido

~~~bash
npx --yes create-axiom-forge meu-projeto
~~~

Sem flags, o CLI pergunta o escopo, agentes, stacks, system designs,
arquitetura, banco, broker, provider e autenticação.

A seleção acontece em uma interface de terminal feita com Ink e tema FORGE:
menu navegável por setas, seleção rápida por número, barra de progresso e uma
animação curta durante a geração. Em scripts e CI, `--yes` mantém o caminho
determinístico e não inicia a interface interativa.

Para automação:

~~~bash
npx --yes create-axiom-forge meu-projeto --agents both --mode full \
  --frontend nextjs --frontend-design next-app-router \
  --backend nestjs --backend-design nest-modular \
  --architecture event-driven --database postgres --broker rabbitmq \
  --provider local --auth axiom-foundation
~~~

Consulte os ids completos com:

~~~bash
npx --yes create-axiom-forge --catalog
~~~

O destino pode ser alterado com --path; o diretório do projeto é criado a
partir do nome informado. O gerador não sobrescreve um diretório existente.

## O que persiste e o que varia

Sempre permanecem SDD, /kickoff em dois modos, Produto vazio, Gitflow,
worktrees, segurança, gates, ADRs, rastreabilidade e o roster de processo.

O perfil escolhido muda:

- escopo: frontend + backend, somente frontend ou somente backend;
- linguagem, framework, package manager e estrutura de pastas;
- system design compatível com a stack;
- banco e seu Compose local;
- arquitetura e broker, com broker obrigatório em Event-Driven;
- provider alvo;
- autenticação, que é none por padrão ou o template técnico compatível.

## Matriz inicial

| Eixo | Opções |
| --- | --- |
| Frontend | Next.js, Vite + React, Vite + Vue, Angular, SvelteKit |
| Backend | NestJS, Express, FastAPI, Go + Gin, Spring Boot, ASP.NET Core |
| Arquitetura | monólito modular, monólito em camadas, microservices, Event-Driven, serverless |
| Banco | none, PostgreSQL, MySQL, MongoDB, SQLite |
| Broker | none, RabbitMQ, Kafka, NATS, Redis Streams |
| Provider | local, AWS, Azure, GCP, Vercel, Cloudflare |

Designs específicos são filtrados: Spring Modulith aparece somente para Spring
Boot; Go standard layout somente para Go; Angular Standalone somente para
Angular; e assim por diante. Isso reduz scaffolds incoerentes e melhora o
contexto dos agentes.

## O que é gerado

~~~text
meu-projeto/
├── product/       # discovery, hipóteses, PRDs, histórias e specs
├── frontend/      # somente se escolhido, com a stack e convenção selecionadas
├── backend/       # somente se escolhido, com a stack e convenção selecionadas
├── docs/          # método, estado, ADRs e perfil selecionado
├── .agents/       # se Codex foi escolhido
├── .claude/       # se Claude foi escolhido
├── docker-compose.yml  # somente quando há banco ou broker
├── .env.example
├── .axiom/stack-profile.json
└── .project-config.json
~~~

Os runtimes gerados começam com um exemplo técnico e /health; não há entidade,
persona, fluxo de negócio ou autenticação escondida. O preset axiom-foundation
é a exceção explícita: reaproveita a fundação de auth existente e só aparece
com Next.js + NestJS + PostgreSQL + RabbitMQ + local.

## Infraestrutura local

RabbitMQ, Kafka, NATS e Redis são oferecidos como imagens públicas para
desenvolvimento local. PostgreSQL, MySQL e MongoDB também usam imagens oficiais.
A seleção EDA exige um broker diferente de none. O Compose de um nó é uma
base local; produção precisa de segurança, HA, backups, observabilidade e
topologia aprovadas.

O nome do projeto também nomeia a infraestrutura:

| Destino | Exemplo para Meu Produto |
| --- | --- |
| pasta e Compose | meu-produto |
| banco relacional | meu_produto |
| vhost RabbitMQ | /meu-produto-local |
| exchange RabbitMQ | meu-produto.events |

O arquivo .env.example explica cada variável. Copie-o para .env e nunca
commite valores reais.

## Kickoff

Depois de gerar:

~~~bash
cd meu-projeto
cp .env.example .env
docker compose up -d
~~~

Abra a conversa do projeto e execute /kickoff. Você pode informar ICP,
problema, alternativas, evidências e hipóteses já conhecidas; ou informar só a
ideia inicial e deixar o agente conduzir uma pesquisa profunda de mercado. O
resultado deve separar fontes, fatos, inferências, hipóteses e experimentos.

## Desenvolvimento deste pacote

~~~bash
npm test
npm run pack:check
~~~

A pesquisa, suas limitações e o ledger de fontes ficam em
../../product/docs/engineering/report-source.md; o contrato do catálogo fica em
../../docs/engineering/stack-library/README.md.
