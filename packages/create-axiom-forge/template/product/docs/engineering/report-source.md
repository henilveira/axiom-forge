# Deep research — catálogo de stacks, arquiteturas e infraestrutura

**Data:** 31/08/2026
**Público:** mantenedores do Axiom Forge e agentes que evoluem o catálogo
**Método:** pesquisa profunda com buscas independentes em lote, documentação
primária/oficial e pesquisas de adoção usadas somente como sinais de mercado.

O plugin de Parallel Search não ficou disponível como ferramenta executável nesta
sessão. As consultas foram separadas por provider e executadas em paralelo pelo
canal de pesquisa disponível. Nenhum formato de agente foi incluído sem uma
fonte verificável.

## Escopo e pergunta

Como transformar o Axiom Forge em um gerador de projetos que permita selecionar
frontend, backend, system design, arquitetura, banco, broker e provider, sem
perder o processo SDD/Gitflow e sem transportar regra de negócio?

A decisão resultante é um catálogo compatível, não um ranking definitivo. O
usuário escolhe um perfil; o gerador produz apenas as camadas escolhidas,
inclui convenções específicas quando a stack suporta a convenção e instala
especialistas que conhecem aquele perfil.

## Resposta executiva

O catálogo inicial prioriza:

- Frontend: Next.js, Vite + React, Vite + Vue, Angular e SvelteKit.
- Backend: NestJS, Express, FastAPI, Go + Gin, Spring Boot e ASP.NET Core.
- Designs: feature-based, Next App Router/RSC, Atomic Design, Vue Composition,
  Angular Standalone, SvelteKit Runes, DDD em camadas, Hexagonal, Vertical
  Slice, Go standard layout, Spring Modulith e ASP.NET Clean.
- Arquiteturas: monólito modular, monólito em camadas, microservices,
  Event-Driven e serverless.
- Dados: nenhum, PostgreSQL, MySQL, MongoDB e SQLite.
- Brokers: nenhum, RabbitMQ, Kafka, NATS e Redis Streams.
- Providers: local + Docker Compose, AWS, Azure, GCP, Vercel e Cloudflare.

Para a camada de agentes, o catálogo inclui Claude Code, Codex, GitHub Copilot,
Cursor, Windsurf, Kimi Code, Google Antigravity, Gemini CLI, Cline, Roo Code,
Kiro, Amazon Q Developer, Continue e OpenCode.

O processo, a biblioteca de Produto vazia, os gates, a segurança, o Gitflow e a
regra de não inventar domínio persistem. Stack, pastas, linguagem, convenções,
Compose, banco, broker, provider e auth são variáveis do perfil.

Event-Driven não é apenas um rótulo: a seleção exige um broker. O Compose local
é uma experiência de desenvolvimento de nó único; não representa HA,
segurança de produção ou uma topologia final.

## Análise por pergunta

### Quais sinais de adoção justificam as opções?

O [Stack Overflow Developer Survey 2025 — Technology](https://survey.stackoverflow.co/2025/technology)
registra crescimento relevante de Python e Docker no recorte de 2025 e aponta
o ecossistema Node.js em torno de React, Next.js e Vue.js. A página também
indica forte interesse de usuários de MongoDB e Redis em PostgreSQL. Esses
dados ajudam a priorizar uma matriz de entrada, mas não devem ser tratados como
prova de que uma tecnologia é sempre melhor.

O [State of Developer Ecosystem 2025 da JetBrains](https://devecosystem-2025.jetbrains.com/tools-and-trends)
relata uma amostra ponderada de 24.534 desenvolvedores em 194 países/regiões e
aponta ascensão real de TypeScript, Go, Rust e Kotlin. Entre linguagens que os
participantes desejam aprender, aparecem Go, Rust, Python, Kotlin e TypeScript.
O [método da pesquisa](https://lp.jetbrains.com/developer-ecosystem-2025-methedology)
é importante para interpretar o resultado: intenção de aprender não é o mesmo
que uso em produção.

Para frontend, o [State of JS 2024 — Front-end Frameworks](https://2024.stateofjs.com/en-US/libraries/front-end-frameworks/)
é um sinal complementar que mantém React, Vue, Angular, Svelte e Preact no
campo de opções relevantes. O catálogo escolhe SvelteKit em vez de gerar Svelte
solto porque o projeto precisa de routing, SSR/SSG e adapters operacionais.

### Quais padrões de arquitetura são úteis como escolhas reais?

O [guia de microservices do Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)
descreve serviços independentemente implantáveis, APIs explícitas, autonomia de
dados e a possibilidade de programação poliglota. Também alerta que a
distribuição cria complexidade operacional. Por isso, a opção microservices do
gerador começa com um scaffold de serviço e uma fronteira explícita; ela não
finge gerar uma frota completa.

O [guia de Event-Driven Architecture da AWS](https://aws.amazon.com/event-driven-architecture/)
modela produtores, roteador/broker e consumidores desacoplados. A escolha de
EDA, portanto, aciona obrigatoriamente um broker no catálogo e documenta
entrega, idempotência, retries e observabilidade como decisões posteriores.
O [guia de transição serverless da AWS](https://docs.aws.amazon.com/serverless/latest/devguide/serverless-transition.html)
reforça que eventos são base de muitos sistemas serverless e que containers,
funções, retries e limites do provider têm trade-offs diferentes.

O [Spring Modulith](https://docs.spring.io/spring-modulith/reference/) é uma
convenção deliberadamente específica: módulos funcionais orientados a domínio
sobre Spring Boot. Por isso aparece somente para Java/Spring Boot. O mesmo
princípio vale para Next App Router/RSC, Angular Standalone, Vue Composition,
SvelteKit Runes, FastAPI routers, Go standard layout e ASP.NET Clean.

### Quais runtimes e frameworks têm fonte oficial clara?

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components):
  layouts e páginas são Server Components por padrão; interatividade fica em
  Client Components.
- [Vite Guide](https://vite.dev/guide/): dev server enxuto, HMR baseado em ESM
  e templates para React, Vue e Svelte.
- [Angular Style Guide](https://angular.dev/style-guide): uma ideia por arquivo,
  standalone e DI são convenções úteis para o scaffold.
- [SvelteKit introduction](https://svelte.dev/docs/kit/introduction): routing,
  load, adapters e modos SSR/estático formam um framework completo.
- [Express installation](https://expressjs.com/en/starter/installing.html):
  pipeline HTTP minimalista e composição explícita de middleware.
- [NestJS documentation](https://docs.nestjs.com/): módulos, TypeScript e DI,
  com Express por padrão e Fastify como opção.
- [FastAPI](https://fastapi.tiangolo.com/): Python tipado por type hints, OpenAPI
  e validação de contratos.
- [tutorial oficial Go + Gin](https://go.dev/doc/tutorial/web-service-gin):
  router e handlers JSON para um serviço HTTP em Go.
- [Spring Boot](https://spring.io/projects/spring-boot): starters, configuração
  opinativa e servidor embutido.
- [ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/introduction-to-aspnet-core):
  pipeline HTTP modular, Kestrel multiplataforma e integração com frontends.

### Quais dependências de infraestrutura devem ser locais e gratuitas?

O [Docker Compose](https://docs.docker.com/compose/) é a unidade local comum:
define serviços, redes e volumes em um YAML. O gerador só cria o arquivo
quando banco ou broker foi selecionado.

As imagens oficiais são usadas para reduzir atrito:
[PostgreSQL](https://hub.docker.com/_/postgres),
[MySQL](https://hub.docker.com/_/mysql),
[MongoDB](https://hub.docker.com/_/mongo) e
[Redis](https://hub.docker.com/_/redis).

Para mensageria, as fontes de comportamento são:

- [RabbitMQ tutorial](https://www.rabbitmq.com/tutorials/tutorial-one-javascript):
  broker que recebe e encaminha mensagens, com publisher e consumer.
- [Kafka quickstart](https://kafka.apache.org/quickstart): tópicos, brokers,
  retenção, consumer groups e streaming de eventos.
- [NATS concepts](https://docs.nats.io/nats-concepts/overview): mensageria
  simples e de baixa latência, com JetStream para persistência e consumo.
- Redis Streams usa a [imagem oficial Redis](https://hub.docker.com/_/redis) e
  fica explicitamente descrito como transporte leve, não como substituto
  automático de um log distribuído.

### O que muda por provider?

O provider é orientação de implantação, nunca provisionamento automático. A
matriz dá suporte a [AWS Containers Free Tier](https://aws.amazon.com/free/containers/),
[Google Cloud Free](https://cloud.google.com/free), Azure Architecture, Vercel
e Cloudflare Workers como destinos que precisam de decisões e credenciais
externas. Vercel e Cloudflare ficam restritos a frontend no catálogo inicial,
porque não devem sugerir que um deploy de frontend é equivalente à hospedagem
de uma API stateful.

### Como os providers organizam agentes e skills?

A decisão central é tratar `SKILL.md` como o formato portátil. Ele permite
reutilizar a mesma instrução em vários clients, mas não substitui os formatos
nativos de agentes, regras e workflows. O gerador adapta o mesmo especialista
para o formato documentado pelo provider selecionado.

| Provider | Formato de projeto confirmado | O que o Axiom Forge gera | Observação operacional |
| --- | --- | --- | --- |
| Claude Code | `.claude/agents/*.md` e `.claude/skills/<name>/SKILL.md` | agentes, skills, regras e hooks do template | agentes e skills têm frontmatter próprio |
| Codex | `AGENTS.md` e `.agents/skills/<name>/SKILL.md` | roster, skills e instruções Codex | o projeto usa o padrão aberto de skills |
| GitHub Copilot | `.github/agents/*.agent.md`, `.github/skills` e instruções GitHub | custom agents, skills e `copilot-instructions.md` | suporte varia entre Copilot CLI, editor, revisão e cloud agent |
| Cursor | `.cursor/rules/*.mdc` e `AGENTS.md` | regras MDC e contexto compartilhado | não foi criado um diretório de agentes que a documentação não confirma |
| Windsurf | `.windsurf/skills`, `.windsurf/rules` e workflows Markdown | skills, regras `model_decision` e `/kickoff` | skills são progressivas, regras e workflows têm ativações diferentes |
| Kimi Code | `.kimi-code/agents/*.md`, `.kimi/skills` e `.agents/skills` | custom agents e skills | o agente pode ser carregado com `--agent-file` |
| Google Antigravity | `.agents/skills`, `.agents/rules` e `.agents/workflows` | skills, regras e workflow de kickoff | regras e workflows são os formatos nativos documentados |
| Gemini CLI | `GEMINI.md`, `.gemini/skills` e `.gemini/commands` | contexto, skills e comando `/kickoff` | `GEMINI.md` é hierárquico e skills carregam sob demanda |
| Cline | `.cline/skills` e `.clinerules` | skills e regras | a documentação confirma skills e regras, não um custom agent universal |
| Roo Code | `.roomodes` e `.roo/rules` | custom modes e regras por especialista | Roo chama o agente especializado de mode |
| Kiro | `.kiro/agents`, `.kiro/skills` e `.kiro/steering` | custom agents, skills e steering | agentes podem precisar de recursos adicionais definidos pelo time |
| Amazon Q Developer | `.amazonq/rules` | regras de projeto | a integração documentada para o repositório é baseada em regras |
| Continue | `.continue/rules` e configuração Continue | regras locais | modelos, MCP e configuração de Agent continuam dependentes do ambiente Continue |
| OpenCode | `AGENTS.md` e `.opencode/skills` | instruções e skills nativos | OpenCode também descobre skills compatíveis em `.agents` e `.claude` |

Fontes usadas para essa matriz: [Claude Skills](https://code.claude.com/docs/en/skills),
[Claude subagents](https://code.claude.com/docs/en/sub-agents),
[Codex AGENTS.md](https://github.com/openai/codex/blob/main/docs/agents_md.md),
[Copilot customization](https://docs.github.com/en/copilot/reference/customization-cheat-sheet),
[Copilot skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills),
[Cursor rules](https://docs.cursor.com/context/rules-for-ai),
[Windsurf skills](https://docs.windsurf.com/windsurf/cascade/skills),
[Windsurf rules](https://docs.windsurf.com/windsurf/cascade/memories),
[Kimi agents](https://moonshotai.github.io/kimi-cli/en/customization/agents.html),
[Kimi skills](https://moonshotai.github.io/kimi-cli/en/customization/skills.html),
[Antigravity skills](https://antigravity.google/docs/skills?app=antigravity-ide),
[Antigravity rules](https://antigravity.google/docs/rules-workflows?app=antigravity),
[Gemini skills](https://google-gemini.github.io/gemini-cli/docs/cli/using-agent-skills.html),
[Gemini context](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html),
[Cline skills](https://docs.cline.bot/customization/skills),
[Roo modes](https://docs.roocode.com/features/custom-modes),
[Roo instructions](https://docs.roocode.com/features/custom-instructions),
[Kiro agents](https://kiro.dev/docs/cli/custom-agents/creating/),
[Kiro skills](https://kiro.dev/docs/skills/),
[Amazon Q rules](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html),
[Continue rules](https://docs.continue.dev/customize/rules),
[Continue config](https://docs.continue.dev/reference),
[OpenCode instructions](https://opencode.ai/docs/instructions) e
[OpenCode skills](https://opencode.ai/docs/skills).

#### O que significa selecionar um provider?

Selecionar um provider instala os arquivos que ele realmente reconhece. A
seleção múltipla não transforma um formato em outro e não adiciona credenciais.
Por exemplo, Copilot recebe custom agents e skills em `.github`, Cursor recebe
regras `.mdc`, Windsurf recebe skills, regras e workflow, e Continue recebe
regras locais. Todos recebem a orientação técnica do perfil escolhido, mas a
forma de abrir ou invocar essa orientação continua sendo a do próprio client.

As skills do processo, incluindo `/kickoff`, são copiadas para os diretórios
nativos quando o provider suporta Agent Skills. Para providers baseados em
regras ou modes, a documentação gerada informa o caminho equivalente. Isso
evita prometer um comando slash que o client não possui.

## O que persiste e o que varia

| Persiste em todo projeto | Varia conforme o perfil |
| --- | --- |
| SDD, /kickoff, discovery em dois modos e Produto sem domínio | linguagem, framework e package manager |
| Gitflow, worktrees, PR, gates e rastreabilidade | estrutura de pastas e naming/conventions |
| segurança, secrets fora do Git, validação de input e ADRs | frontend/backend e system design |
| roster de processo e especialistas selecionados | banco, migrations, broker e Compose |
| regra APPROVED/approved antes de comportamento | provider e template opcional de autenticação |

## Limitações e decisões futuras

Pesquisas de comunidade têm viés de amostra, geografia e auto-seleção. Os
percentuais e tendências não são um benchmark universal nem substituem uma
decisão contextual de custo, contratação, latência, compliance e maturidade.

O catálogo inicial gera skeletons técnicos pequenos, não implementações
production-ready de cada framework. Ainda devem ser adicionados, conforme
demanda real:

- Rust/Axum, Kotlin/Ktor ou Spring, Laravel/PHP, Ruby/Rails, Django e GraphQL;
- Redis como cache separado da escolha de broker;
- brokers gerenciados, bancos serverless e providers adicionais;
- manifests de Kubernetes, IaC e pipelines provider-specific;
- matrizes de compatibilidade mais granulares para auth, ORM, observabilidade e
  testes por linguagem.

## Ledger de claims e fontes

| Claim usado no catálogo | Fonte primária ou de adoção |
| --- | --- |
| tendências de linguagens, Docker e desejos de stack | [Stack Overflow 2025](https://survey.stackoverflow.co/2025/technology), [JetBrains 2025](https://devecosystem-2025.jetbrains.com/tools-and-trends) |
| React/Vue/Angular/Svelte como opções de frontend | [State of JS 2024](https://2024.stateofjs.com/en-US/libraries/front-end-frameworks/) |
| microservices, APIs, autonomia de dados e custo distribuído | [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices) |
| produtores, broker/router e consumidores em EDA | [AWS EDA](https://aws.amazon.com/event-driven-architecture/) |
| trade-offs de funções, containers e eventos | [AWS serverless transition](https://docs.aws.amazon.com/serverless/latest/devguide/serverless-transition.html) |
| convenções específicas de runtime | [Next](https://nextjs.org/docs/app/building-your-application/rendering/server-components), [Vite](https://vite.dev/guide/), [Angular](https://angular.dev/style-guide), [SvelteKit](https://svelte.dev/docs/kit/introduction), [FastAPI](https://fastapi.tiangolo.com/), [Spring Boot](https://spring.io/projects/spring-boot), [ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/introduction-to-aspnet-core) |
| containers locais e imagens de dados | [Docker Compose](https://docs.docker.com/compose/), [Postgres](https://hub.docker.com/_/postgres), [MySQL](https://hub.docker.com/_/mysql), [Mongo](https://hub.docker.com/_/mongo), [Redis](https://hub.docker.com/_/redis) |
| brokers e streaming | [RabbitMQ](https://www.rabbitmq.com/tutorials/tutorial-one-javascript), [Kafka](https://kafka.apache.org/quickstart), [NATS](https://docs.nats.io/nats-concepts/overview) |
| formatos de agentes, skills, regras e workflows | [Claude](https://code.claude.com/docs/en/skills), [Copilot](https://docs.github.com/en/copilot/reference/customization-cheat-sheet), [Cursor](https://docs.cursor.com/context/rules-for-ai), [Windsurf](https://docs.windsurf.com/windsurf/cascade/skills), [Kimi](https://moonshotai.github.io/kimi-cli/en/customization/agents.html), [Antigravity](https://antigravity.google/docs/skills?app=antigravity-ide), [Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/using-agent-skills.html), [Cline](https://docs.cline.bot/customization/skills), [Roo](https://docs.roocode.com/features/custom-modes), [Kiro](https://kiro.dev/docs/skills/), [Amazon Q](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html), [Continue](https://docs.continue.dev/customize/rules), [OpenCode](https://opencode.ai/docs/skills) |
