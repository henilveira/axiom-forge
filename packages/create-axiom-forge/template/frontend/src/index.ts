// Barrel raiz do app (ADR-0004): único ponto de import entre pastas — `import { X } from "@"`.
// `app/` fica de fora de propósito: são rotas resolvidas pelo router, ninguém as importa, e
// reexportá-las criaria ciclo (rota importa de "@", "@" reexportaria a rota).
export * from "./features";
export * from "./shared";
