const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

export const CATALOG_VERSION = "2026-08-31";

export const PROJECT_MODES = deepFreeze([
  { value: "full", label: "Frontend + Backend", description: "gera as duas camadas e os contratos entre elas" },
  { value: "frontend", label: "Somente Frontend", description: "gera apenas a aplicação web" },
  { value: "backend", label: "Somente Backend", description: "gera apenas a API/serviço" },
]);

export const FRONTEND_STACKS = deepFreeze([
  {
    value: "nextjs",
    label: "Next.js + React + TypeScript",
    language: "TypeScript",
    framework: "Next.js",
    description: "React com App Router, Server Components e renderização híbrida",
    systemDesigns: ["next-app-router", "feature-based"],
    specialist: "stack-frontend-nextjs",
    commands: { install: "npm install", dev: "npm run dev", build: "npm run build", test: "npm test" },
    sources: [
      "https://nextjs.org/docs/app/building-your-application/rendering/server-components",
    ],
  },
  {
    value: "vite-react",
    label: "Vite + React + TypeScript",
    language: "TypeScript",
    framework: "Vite/React",
    description: "SPA leve com HMR rápido e assets estáticos para deploy desacoplado",
    systemDesigns: ["feature-based", "atomic-design"],
    specialist: "stack-frontend-vite-react",
    commands: { install: "npm install", dev: "npm run dev", build: "npm run build", test: "npm test" },
    sources: ["https://vite.dev/guide/"],
  },
  {
    value: "vite-vue",
    label: "Vite + Vue + TypeScript",
    language: "TypeScript",
    framework: "Vite/Vue",
    description: "Vue com Composition API e build moderno baseado em Vite",
    systemDesigns: ["vue-composition", "feature-based", "atomic-design"],
    specialist: "stack-frontend-vite-vue",
    commands: { install: "npm install", dev: "npm run dev", build: "npm run build", test: "npm test" },
    sources: ["https://vite.dev/guide/"],
  },
  {
    value: "angular",
    label: "Angular + TypeScript",
    language: "TypeScript",
    framework: "Angular",
    description: "framework completo com DI, routing, forms e convenção oficial de projeto",
    systemDesigns: ["angular-standalone", "feature-based"],
    specialist: "stack-frontend-angular",
    commands: { install: "npm install", dev: "npm start", build: "npm run build", test: "npm test" },
    sources: ["https://angular.dev/style-guide"],
  },
  {
    value: "sveltekit",
    label: "SvelteKit + TypeScript",
    language: "TypeScript",
    framework: "SvelteKit",
    description: "Svelte compilado com routing, SSR/SSG e adapters para diferentes providers",
    systemDesigns: ["sveltekit-runes", "feature-based"],
    specialist: "stack-frontend-sveltekit",
    commands: { install: "npm install", dev: "npm run dev", build: "npm run build", test: "npm test" },
    sources: ["https://svelte.dev/docs/kit/introduction"],
  },
]);

export const BACKEND_STACKS = deepFreeze([
  {
    value: "nestjs",
    label: "NestJS + TypeScript",
    language: "TypeScript",
    framework: "NestJS",
    description: "módulos, DI e adapters sobre Node.js para APIs e serviços",
    systemDesigns: ["nest-modular", "ddd-layered", "hexagonal", "vertical-slice"],
    specialist: "stack-backend-nestjs",
    commands: { install: "npm install", dev: "npm run start:dev", build: "npm run build", test: "npm test" },
    sources: ["https://docs.nestjs.com/"],
  },
  {
    value: "express",
    label: "Express + TypeScript",
    language: "TypeScript",
    framework: "Express",
    description: "pipeline HTTP minimalista para APIs Node.js com composição explícita",
    systemDesigns: ["feature-based", "hexagonal", "vertical-slice"],
    specialist: "stack-backend-express",
    commands: { install: "npm install", dev: "npm run dev", build: "npm run build", test: "npm test" },
    sources: ["https://expressjs.com/en/starter/installing.html"],
  },
  {
    value: "fastapi",
    label: "FastAPI + Python",
    language: "Python",
    framework: "FastAPI",
    description: "APIs tipadas com type hints, OpenAPI e validação de contratos",
    systemDesigns: ["fastapi-router-service", "hexagonal", "vertical-slice"],
    specialist: "stack-backend-fastapi",
    commands: { install: "python -m pip install -e .", dev: "uvicorn app.main:app --reload", build: "python -m compileall app", test: "pytest" },
    sources: ["https://fastapi.tiangolo.com/"],
  },
  {
    value: "go-gin",
    label: "Go + Gin",
    language: "Go",
    framework: "Gin",
    description: "serviço compilado com router HTTP leve e layout idiomático de Go",
    systemDesigns: ["go-standard-layout", "hexagonal"],
    specialist: "stack-backend-go",
    commands: { install: "go mod download", dev: "go run ./cmd/api", build: "go build ./...", test: "go test ./..." },
    sources: ["https://go.dev/doc/tutorial/web-service-gin"],
  },
  {
    value: "spring-boot",
    label: "Java + Spring Boot",
    language: "Java",
    framework: "Spring Boot",
    description: "aplicação Java opinativa com starters, servidor embutido e ecossistema Spring",
    systemDesigns: ["spring-modulith", "ddd-layered", "hexagonal", "vertical-slice"],
    specialist: "stack-backend-spring-boot",
    commands: { install: "mvn dependency:go-offline", dev: "mvn spring-boot:run", build: "mvn package", test: "mvn test" },
    sources: ["https://spring.io/projects/spring-boot", "https://docs.spring.io/spring-modulith/reference/"],
  },
  {
    value: "aspnet-core",
    label: "C# + ASP.NET Core",
    language: "C#",
    framework: "ASP.NET Core",
    description: "pipeline HTTP modular e multiplataforma com Kestrel e APIs modernas",
    systemDesigns: ["aspnet-clean", "vertical-slice", "hexagonal"],
    specialist: "stack-backend-aspnet-core",
    commands: { install: "dotnet restore", dev: "dotnet run", build: "dotnet build", test: "dotnet test" },
    sources: ["https://learn.microsoft.com/en-us/aspnet/core/introduction-to-aspnet-core"],
  },
]);

export const FRONTEND_DESIGNS = deepFreeze([
  { value: "feature-based", label: "Feature-based + shared UI", description: "features isoladas, contratos próximos ao uso e UI reutilizável" },
  { value: "next-app-router", label: "Next App Router + RSC", description: "rotas/layouts com Server Components por padrão; exclusivo de Next.js", stacks: ["nextjs"] },
  { value: "atomic-design", label: "Atomic Design", description: "átomos, moléculas, organismos e páginas; útil para bibliotecas de UI", stacks: ["vite-react", "vite-vue", "angular"] },
  { value: "vue-composition", label: "Vue Composition API", description: "composables e componentes orientados a responsabilidades; exclusivo de Vue", stacks: ["vite-vue"] },
  { value: "angular-standalone", label: "Angular Standalone", description: "componentes standalone, DI e routing por feature; exclusivo de Angular", stacks: ["angular"] },
  { value: "sveltekit-runes", label: "SvelteKit + Runes", description: "rotas SvelteKit e estado explícito com runes; exclusivo de SvelteKit", stacks: ["sveltekit"] },
]);

export const BACKEND_DESIGNS = deepFreeze([
  { value: "feature-based", label: "Feature-based", description: "cada capacidade organiza contrato, aplicação e adapter próximos" },
  { value: "ddd-layered", label: "DDD + camadas", description: "interfaces → application → domain ← infrastructure" },
  { value: "hexagonal", label: "Hexagonal / Ports & Adapters", description: "núcleo independente e integrações substituíveis por portas", stacks: ["nestjs", "express", "fastapi", "go-gin", "spring-boot", "aspnet-core"] },
  { value: "vertical-slice", label: "Vertical Slice", description: "cada capacidade atravessa o stack em uma fatia coesa", stacks: ["nestjs", "express", "fastapi", "spring-boot", "aspnet-core"] },
  { value: "nest-modular", label: "Nest modular", description: "módulos Nest por capacidade com DI e adapters explícitos", stacks: ["nestjs"] },
  { value: "fastapi-router-service", label: "FastAPI routers + services", description: "routers finos, schemas Pydantic e serviços por capacidade", stacks: ["fastapi"] },
  { value: "go-standard-layout", label: "Go standard layout", description: "cmd/, internal/ e packages orientados ao serviço", stacks: ["go-gin"] },
  { value: "spring-modulith", label: "Spring Modulith", description: "módulos funcionais DDD e eventos internos sobre Spring Boot", stacks: ["spring-boot"] },
  { value: "aspnet-clean", label: "ASP.NET Clean Architecture", description: "Application/Core/Infrastructure/API com dependências apontando para o núcleo", stacks: ["aspnet-core"] },
]);

export const ARCHITECTURES = deepFreeze([
  { value: "modular-monolith", label: "Monólito modular", description: "um deploy, módulos isolados e caminho gradual para extração", specialist: "architecture-modular-monolith" },
  { value: "microservices", label: "Microservices", description: "serviços independentes, APIs explícitas e autonomia de dados; começa com um serviço scaffold", specialist: "architecture-microservices" },
  { value: "event-driven", label: "Event-Driven Architecture", description: "produtores, broker/router e consumidores desacoplados", requiresBroker: true, specialist: "architecture-event-driven" },
  { value: "serverless", label: "Serverless", description: "unidades sob demanda, eventos e provider como parte do runtime", specialist: "architecture-serverless" },
  { value: "layered-monolith", label: "Monólito em camadas", description: "ponto de partida simples para produto ainda sem fronteiras estabilizadas" },
]);

export const DATABASES = deepFreeze([
  { value: "none", label: "Sem banco inicial", description: "contratos e adapters ficam preparados sem persistência local" },
  { value: "postgres", label: "PostgreSQL", description: "relacional open source, forte opção default para produto e DDD", service: "postgres", image: "postgres:16-alpine", port: 5432, specialist: "database-postgres", url: "postgresql://user:password@localhost:5432/{database}?schema=public", source: "https://hub.docker.com/_/postgres" },
  { value: "mysql", label: "MySQL", description: "relacional open source com amplo ecossistema de hospedagem", service: "mysql", image: "mysql:8.4", port: 3306, specialist: "database-mysql", url: "mysql://user:password@localhost:3306/{database}", source: "https://hub.docker.com/_/mysql" },
  { value: "mongodb", label: "MongoDB", description: "documentos e schema flexível para domínios orientados a agregados", service: "mongodb", image: "mongo:8", port: 27017, specialist: "database-mongodb", url: "mongodb://user:password@localhost:27017/{database}?authSource=admin", source: "https://hub.docker.com/_/mongo" },
  { value: "sqlite", label: "SQLite", description: "arquivo local zero-config para protótipos, CLIs e serviços simples", specialist: "database-sqlite", url: "file:./data/{database}.sqlite" },
]);

export const BROKERS = deepFreeze([
  { value: "none", label: "Sem broker", description: "somente chamadas síncronas; incompatível com Event-Driven Architecture" },
  { value: "rabbitmq", label: "RabbitMQ", description: "AMQP, routing explícito, filas e painel de management", service: "rabbitmq", image: "rabbitmq:3-management-alpine", port: 5672, managementPort: 15672, specialist: "broker-rabbitmq", url: "amqp://localhost:5672", source: "https://www.rabbitmq.com/tutorials/tutorial-one-javascript" },
  { value: "kafka", label: "Apache Kafka", description: "event streaming durável com tópicos e retenção", service: "kafka", image: "apache/kafka:4.3.1", port: 9092, specialist: "broker-kafka", url: "localhost:9092", source: "https://kafka.apache.org/quickstart" },
  { value: "nats", label: "NATS + JetStream", description: "mensageria simples e de baixa latência com persistência opcional", service: "nats", image: "nats:2.11-alpine", port: 4222, managementPort: 8222, specialist: "broker-nats", url: "nats://localhost:4222", source: "https://docs.nats.io/nats-concepts/overview" },
  { value: "redis-streams", label: "Redis Streams", description: "streams leves usando Redis como datastore e transporte", service: "redis", image: "redis:7-alpine", port: 6379, specialist: "broker-redis-streams", url: "redis://localhost:6379", source: "https://hub.docker.com/_/redis" },
]);

export const PROVIDERS = deepFreeze([
  { value: "local", label: "Local + Docker Compose", description: "desenvolvimento local reproduzível; sem credenciais externas" },
  { value: "aws", label: "AWS", description: "ECS/Fargate, Lambda, RDS e serviços gerenciados conforme a arquitetura", specialist: "provider-aws", source: "https://aws.amazon.com/free/containers/" },
  { value: "azure", label: "Microsoft Azure", description: "Container Apps, App Service, Functions e dados gerenciados", specialist: "provider-azure", source: "https://learn.microsoft.com/en-us/azure/architecture/" },
  { value: "gcp", label: "Google Cloud", description: "Cloud Run, Cloud Functions e serviços gerenciados", specialist: "provider-gcp", source: "https://cloud.google.com/free" },
  { value: "vercel", label: "Vercel", description: "deploy otimizado para frontend/Next; backend continua separado", specialist: "provider-vercel", frontendOnly: true, source: "https://vercel.com/docs" },
  { value: "cloudflare", label: "Cloudflare", description: "edge/frontend e Workers; este scaffold limita o provider a frontend-only", specialist: "provider-cloudflare", frontendOnly: true, source: "https://developers.cloudflare.com/workers/" },
]);

export const AUTH_TEMPLATES = deepFreeze([
  { value: "none", label: "Sem autenticação pronta", description: "o projeto começa neutro para você definir a própria estratégia" },
  { value: "axiom-foundation", label: "Axiom Auth Foundation", description: "fundação técnica existente de autenticação, opcional e somente para Next + Nest + Postgres + RabbitMQ", compatible: { mode: "full", frontend: "nextjs", backend: "nestjs", database: "postgres", broker: "rabbitmq", provider: "local" } },
]);

export const SPECIALIST_LIBRARY = deepFreeze({
  "stack-frontend-nextjs": { layer: "frontend", title: "Next.js specialist", focus: "App Router, Server Components, hydration boundaries, metadata, caching and route conventions", rules: ["Keep data fetching in server boundaries or explicit services.", "Use client components only for local interactivity.", "Preserve the selected feature and shared UI boundaries."] },
  "stack-frontend-vite-react": { layer: "frontend", title: "Vite + React specialist", focus: "SPA composition, Vite HMR/build, route boundaries and typed React components", rules: ["Keep API contracts in schemas and services.", "Do not hide data fetching inside presentational components.", "Keep build-time environment variables explicit."] },
  "stack-frontend-vite-vue": { layer: "frontend", title: "Vite + Vue specialist", focus: "Vue Composition API, composables, SFC boundaries and Vite build", rules: ["Keep composables focused and typed.", "Keep API contracts outside visual components.", "Respect the selected feature structure."] },
  "stack-frontend-angular": { layer: "frontend", title: "Angular specialist", focus: "standalone components, dependency injection, routing, forms and one-concept-per-file structure", rules: ["Prefer standalone components and route-level boundaries.", "Keep templates simple; move orchestration to services.", "Follow Angular's one-concept-per-file guidance."] },
  "stack-frontend-sveltekit": { layer: "frontend", title: "SvelteKit specialist", focus: "file-based routing, load functions, server-only modules, adapters and Svelte reactivity", rules: ["Keep server-only code out of browser bundles.", "Use route load/actions as explicit boundaries.", "Keep shared UI free of transport concerns."] },
  "stack-backend-nestjs": { layer: "backend", title: "NestJS specialist", focus: "modules, dependency injection, controllers, providers and adapters over Node.js", rules: ["Keep controllers thin and domain framework-free.", "Use modules to express capabilities, not generic folders.", "Keep external effects behind application ports."] },
  "stack-backend-express": { layer: "backend", title: "Express specialist", focus: "middleware pipeline, typed routes, explicit composition and small HTTP adapters", rules: ["Keep middleware order visible and intentional.", "Do not put domain decisions in route handlers.", "Validate unknown input at the HTTP boundary."] },
  "stack-backend-fastapi": { layer: "backend", title: "FastAPI specialist", focus: "Pydantic contracts, routers, dependency injection and async Python services", rules: ["Keep Pydantic schemas at the boundary.", "Keep routers thin and use services/use cases for behavior.", "Declare async boundaries and external clients explicitly."] },
  "stack-backend-go": { layer: "backend", title: "Go specialist", focus: "Gin handlers, cmd/internal layout, explicit errors, context propagation and small packages", rules: ["Keep package dependencies acyclic and narrow.", "Propagate context and handle errors explicitly.", "Avoid global mutable state and framework leakage into domain packages."] },
  "stack-backend-spring-boot": { layer: "backend", title: "Spring Boot specialist", focus: "Spring Boot starters, DI, configuration, Spring Modulith and Java package boundaries", rules: ["Keep configuration and adapters outside domain policies.", "Use functional modules when Spring Modulith is selected.", "Keep transactions and external effects explicit."] },
  "stack-backend-aspnet-core": { layer: "backend", title: "ASP.NET Core specialist", focus: "Kestrel pipeline, minimal APIs/controllers, DI, options and clean/vertical slices", rules: ["Keep endpoints thin and validate request contracts.", "Use DI and options instead of service locators or statics.", "Keep core policies independent of ASP.NET concerns."] },
  "architecture-modular-monolith": { layer: "architecture", title: "Modular monolith specialist", focus: "module boundaries, dependency direction, one deploy and extraction seams", rules: ["Modules communicate through explicit contracts.", "Do not share persistence tables as an implicit API.", "Prefer a boring deploy until independent scaling is justified."] },
  "architecture-microservices": { layer: "architecture", title: "Microservices specialist", focus: "service boundaries, API contracts, data ownership, operational cost and migration seams", rules: ["Do not split services before a boundary and operational reason exist.", "Each service owns its state or external state contract.", "Record sync/async communication and failure modes."] },
  "architecture-event-driven": { layer: "architecture", title: "Event-driven specialist", focus: "event contracts, producers, broker topology, consumers, retries, idempotency and observability", rules: ["Every event needs an owner, version and delivery semantics.", "Use a real broker for integration; mocks do not prove topology.", "Consumers must be idempotent and failures observable."] },
  "architecture-serverless": { layer: "architecture", title: "Serverless specialist", focus: "function boundaries, event triggers, statelessness, provider limits and cold-start tradeoffs", rules: ["Treat provider limits and retry semantics as part of the design.", "Keep handlers thin and core behavior portable.", "Do not claim local parity with a cloud event service without an emulator or integration proof."] },
  "database-postgres": { layer: "database", title: "PostgreSQL specialist", focus: "relational modeling, migrations, transactions, indexes, constraints and operational backups", rules: ["Make constraints and transaction boundaries explicit.", "Use forward-only migrations and verify rollback strategy.", "Never put credentials in committed files."] },
  "database-mysql": { layer: "database", title: "MySQL specialist", focus: "relational modeling, InnoDB transactions, migrations and compatibility with hosting providers", rules: ["Pin SQL behavior and engine assumptions.", "Make collation, timezone and migration decisions explicit.", "Keep repositories behind ports."] },
  "database-mongodb": { layer: "database", title: "MongoDB specialist", focus: "document boundaries, indexes, atomic document updates and schema evolution", rules: ["Model aggregate access patterns before collections.", "Validate documents at boundaries and version migrations/backfills.", "Do not pretend document storage provides relational constraints."] },
  "database-sqlite": { layer: "database", title: "SQLite specialist", focus: "file-backed persistence, locking, local workflows and migration limits", rules: ["Document single-writer and concurrency assumptions.", "Keep the adapter replaceable if the product outgrows a file.", "Never treat SQLite as a transparent production substitute without evidence."] },
  "broker-rabbitmq": { layer: "broker", title: "RabbitMQ specialist", focus: "exchanges, queues, routing keys, acknowledgements, retries and dead-letter topology", rules: ["Declare topology intentionally and idempotently.", "Define acknowledgement and retry semantics per consumer.", "Keep management access local-only unless secured."] },
  "broker-kafka": { layer: "broker", title: "Kafka specialist", focus: "topics, partitions, consumer groups, retention, ordering and event streaming", rules: ["Choose partition keys and ordering guarantees explicitly.", "Treat retention and replay as part of the contract.", "Use a single-node local profile only for development, not HA claims."] },
  "broker-nats": { layer: "broker", title: "NATS specialist", focus: "subjects, request/reply, pub/sub and JetStream durability", rules: ["Distinguish core NATS delivery from JetStream persistence.", "Define subject ownership and consumer acknowledgement semantics.", "Keep stream retention and limits explicit."] },
  "broker-redis-streams": { layer: "broker", title: "Redis Streams specialist", focus: "stream keys, consumer groups, pending entries and lightweight event transport", rules: ["Define retention and pending-entry recovery.", "Do not confuse Redis Streams with a full event log without documenting limits.", "Keep Redis availability and persistence assumptions visible."] },
  "provider-aws": { layer: "provider", title: "AWS provider specialist", focus: "container/serverless target selection, IAM boundaries, managed data and cost-aware local parity", rules: ["Do not commit credentials or assume account configuration.", "Map each local service to an explicit managed target.", "Record region, data residency and rollback decisions as ADRs."] },
  "provider-azure": { layer: "provider", title: "Azure provider specialist", focus: "Container Apps/App Service/Functions, managed identity and Azure data services", rules: ["Prefer managed identity over static secrets.", "Map runtime limits and deployment slots explicitly.", "Keep provider-specific code behind ports where portability matters."] },
  "provider-gcp": { layer: "provider", title: "Google Cloud provider specialist", focus: "Cloud Run/functions, managed databases, service accounts and container delivery", rules: ["Keep service account scopes minimal.", "Record Cloud Run/function timeout and retry semantics.", "Separate local Compose from cloud-managed service claims."] },
  "provider-vercel": { layer: "provider", title: "Vercel provider specialist", focus: "Next/static frontend deployment, environment scopes and server/client boundaries", rules: ["Never expose server-only secrets through public environment variables.", "Document the separate backend origin and CORS contract.", "Keep edge/runtime constraints explicit."] },
  "provider-cloudflare": { layer: "provider", title: "Cloudflare provider specialist", focus: "edge frontend, Workers constraints, bindings and deployment adapters", rules: ["Keep Node-only APIs out of Worker targets.", "Document bindings and compatibility flags.", "Treat backend services as a separate deployment unless a Worker backend is explicitly designed."] },
});

export function getOption(options, value) {
  return options.find((option) => option.value === value);
}

export function compatibleDesigns(options, stackValue) {
  return options.filter((option) => !option.stacks || option.stacks.includes(stackValue));
}

export function defaultDesign(options, stackValue) {
  const compatible = compatibleDesigns(options, stackValue);
  return compatible[0]?.value;
}
