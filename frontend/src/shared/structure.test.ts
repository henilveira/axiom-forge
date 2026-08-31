import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// AC-3: a fronteira feature-based do ADR-0002 existe desde o commit zero.
// ponytail: um teste de estrutura, não de comportamento — não há comportamento ainda.
// Substituível por testes de feature reais assim que a Fase 1 (Auth) entrar.
const src = join(import.meta.dirname, "..");

test.each(["app", "features", "shared"])(
  "src/%s existe (organização feature-based, ADR-0002)",
  (dir) => {
    expect(existsSync(join(src, dir))).toBe(true);
  },
);

// ADR-0004: toda pasta de código tem index.ts, concentrando num único barrel raiz.
// `app/` fica de fora: rotas são entrypoints do router, não superfície de import.
test.each(["index.ts", "features/index.ts", "shared/index.ts"])(
  "src/%s existe (barrel export, ADR-0004)",
  (barrel) => {
    expect(existsSync(join(src, barrel))).toBe(true);
  },
);
