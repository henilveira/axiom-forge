import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const temporaryDirectories: string[] = [];
const validatorPath = join(import.meta.dirname, '../../scripts/validate-frontend-structure.mjs');

const runValidator = (rootDirectory: string) => execFileSync(process.execPath, [validatorPath, '--root', rootDirectory], { encoding: 'utf8', stdio: 'pipe' });

const writeFixture = (rootDirectory: string, filePath: string, contents: string) => {
  const absolutePath = join(rootDirectory, filePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
};

const createValidFixture = () => {
  const rootDirectory = mkdtempSync(join('/tmp', 'starter-frontend-structure-'));
  temporaryDirectories.push(rootDirectory);
  writeFixture(rootDirectory, 'tsconfig.json', JSON.stringify({ compilerOptions: { paths: { '@orders': ['./src/features/orders/index.ts'] } } }));
  writeFixture(rootDirectory, 'next.config.ts', "const config = { turbopack: { resolveAlias: { '@orders': './src/features/orders/index.ts' } } }; export default config;");
  writeFixture(rootDirectory, 'src/index.ts', 'export * from "./features";');
  writeFixture(rootDirectory, 'src/features/index.ts', 'export * from "./orders";');
  writeFixture(rootDirectory, 'src/features/orders/index.ts', 'export * from "./schemas"; export * from "./types"; export * from "./constants"; export * from "./orchestration"; export * from "./components";');
  writeFixture(rootDirectory, 'src/features/orders/schemas/index.ts', 'export * from "./order.schema";');
  writeFixture(rootDirectory, 'src/features/orders/schemas/order.schema.ts', 'import { z } from "zod"; export const orderSchema = z.object({ id: z.string() });');
  writeFixture(rootDirectory, 'src/features/orders/types/index.ts', 'export type { Order } from "./order.types";');
  writeFixture(rootDirectory, 'src/features/orders/types/order.types.ts', 'export type Order = { id: string };');
  writeFixture(rootDirectory, 'src/features/orders/constants/index.ts', 'export * from "./order.constants";');
  writeFixture(rootDirectory, 'src/features/orders/constants/order.constants.ts', 'export const ORDER_LABEL = "Order";');
  writeFixture(rootDirectory, 'src/features/orders/orchestration/index.ts', 'export * from "./order.orchestration";');
  writeFixture(rootDirectory, 'src/features/orders/orchestration/order.orchestration.ts', 'export const startOrder = () => undefined;');
  writeFixture(rootDirectory, 'src/features/orders/components/index.ts', 'export * from "./ui";');
  writeFixture(rootDirectory, 'src/features/orders/components/ui/index.ts', 'export * from "./order-card";');
  writeFixture(rootDirectory, 'src/features/orders/components/ui/order-card.tsx', 'export const OrderCard = () => null;');
  return rootDirectory;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('validate-frontend-structure', () => {
  test('accepts the canonical feature tree and public barrels', () => {
    expect(() => { runValidator(createValidFixture()); }).not.toThrow();
  });

  test('reports misplaced schemas and missing zod parsing', () => {
    const rootDirectory = createValidFixture();
    writeFixture(rootDirectory, 'src/features/orders/types/wrong.schema.ts', 'export const wrong = {};');
    writeFixture(rootDirectory, 'src/features/orders/schemas/unparsed.schema.ts', 'export const unparsed = {};');

    expect(() => { runValidator(rootDirectory); }).toThrow(/AF-ARCH-001/);
    expect(() => { runValidator(rootDirectory); }).toThrow(/AF-ARCH-002/);
  });

  test('reports a production component placed directly under components', () => {
    const rootDirectory = createValidFixture();
    writeFixture(rootDirectory, 'src/features/orders/components/order-card.tsx', 'export const OrderCard = () => null;');

    expect(() => { runValidator(rootDirectory); }).toThrow(/AF-ARCH-006/);
  });

  test('reports interactive features without orchestration', () => {
    const rootDirectory = createValidFixture();
    rmSync(join(rootDirectory, 'src/features/orders/orchestration'), { recursive: true, force: true });
    writeFixture(rootDirectory, 'src/features/orders/components/client/order-client.tsx', "'use client'; export const OrderClient = () => null;");
    writeFixture(rootDirectory, 'src/features/orders/components/client/index.ts', 'export * from "./order-client";');

    expect(() => { runValidator(rootDirectory); }).toThrow(/AF-ARCH-012/);
  });
});
