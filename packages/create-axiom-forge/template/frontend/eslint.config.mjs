import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import boundaries from '@boundaries/eslint-plugin';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import sonarjs from 'eslint-plugin-sonarjs';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}'];
const featureFiles = ['src/features/**/*.{ts,tsx}'];
const dedicatedTypeFiles = [
  'src/features/**/*.types.ts',
  'src/features/**/*.schema.ts',
  'src/features/**/*.props.ts',
];
const frontendRoot = import.meta.dirname;
const featureRoot = join(frontendRoot, 'src', 'features');
const featureNames = existsSync(featureRoot)
  ? readdirSync(featureRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .sort()
  : [];
const excludedBarrelDirectories = new Set(['__mocks__', '__tests__', 'factories', 'fixtures', 'mocks', 'test', 'tests']);
const findCodeDirectories = (rootDirectory) => {
  const directories = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || excludedBarrelDirectories.has(entry.name)) {
        continue;
      }

      const childDirectory = join(directory, entry.name);
      directories.push(childDirectory);
      visit(childDirectory);
    }
  };

  visit(rootDirectory);
  return directories;
};

const crossFolderImportSelectors = [
  {
    selector: 'ImportDeclaration[source.value=/^\\.\\.?\\/[^/]+\\//]',
    message: '[AF-ARCH-IMPORT-001] Import interno entre pastas não pode apontar para um arquivo por caminho relativo. Importe pelo barrel público (\'@\' ou \'@<feature>\'); ./arquivo na mesma pasta e pacotes externos continuam permitidos.',
  },
  {
    selector: 'ExportNamedDeclaration[source.value=/^\\.\\.?\\/[^/]+\\//]',
    message: '[AF-ARCH-IMPORT-001] Reexport interno entre pastas deve passar pelo barrel público (\'@\' ou \'@<feature>\'); não use caminho relativo profundo. Pacotes externos continuam permitidos.',
  },
  {
    selector: 'ExportAllDeclaration[source.value=/^\\.\\.?\\/[^/]+\\//]',
    message: '[AF-ARCH-IMPORT-001] Reexport interno entre pastas deve passar pelo barrel público (\'@\' ou \'@<feature>\'); não use caminho relativo profundo. Pacotes externos continuam permitidos.',
  },
];
const deepAliasRestriction = {
  regex: '^@/.+',
  message: '[AF-ARCH-IMPORT-002] Alias interno profundo é proibido. Use @ para o barrel raiz ou @<feature> para o barrel público da feature.',
};
const frontendRestrictedImportPatterns = [deepAliasRestriction];

const applicationFeatureContractRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Exige barrel e alias público sincronizados para cada feature.' },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const tsconfigPath = join(frontendRoot, 'tsconfig.json');
        const nextConfigPath = join(frontendRoot, 'next.config.ts');
        const tsconfigSource = existsSync(tsconfigPath) ? readFileSync(tsconfigPath, 'utf8') : '';
        const nextConfigSource = existsSync(nextConfigPath) ? readFileSync(nextConfigPath, 'utf8') : '';

        for (const featureName of featureNames) {
          const featureDirectory = join(featureRoot, featureName);
          const featureAlias = `@${featureName}`;
          const expectedPath = `./src/features/${featureName}/index.ts`;

          if (!existsSync(join(featureDirectory, 'index.ts'))) {
            context.report({ node, message: `[AF-FEATURE-CONTRACT-001] A feature '${featureName}' precisa de src/features/${featureName}/index.ts como barrel público.` });
          }

          for (const codeDirectory of findCodeDirectories(featureDirectory)) {
            if (!existsSync(join(codeDirectory, 'index.ts'))) {
              context.report({ node, message: `[AF-FEATURE-CONTRACT-001] A pasta de código '${codeDirectory.slice(frontendRoot.length + 1)}' precisa de index.ts.` });
            }
          }

          const escapedAlias = featureAlias.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
          const escapedPath = expectedPath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
          const tsconfigAliasPattern = new RegExp(`"${escapedAlias}"\\s*:\\s*\\[\\s*"${escapedPath}"\\s*\\]`);
          const nextAliasPattern = new RegExp(`resolveAlias[\\s\\S]*["']${escapedAlias}["']\\s*:\\s*["']${escapedPath}["']`);

          if (!tsconfigAliasPattern.test(tsconfigSource)) {
            context.report({ node, message: `[AF-FEATURE-CONTRACT-002] Falta em tsconfig.json o alias exato ${featureAlias} → ${expectedPath}.` });
          }

          if (!nextAliasPattern.test(nextConfigSource)) {
            context.report({ node, message: `[AF-FEATURE-CONTRACT-002] Falta em next.config.ts/turbopack.resolveAlias o alias exato ${featureAlias} → ${expectedPath}.` });
          }
        }
      },
    };
  },
};

const componentLayers = [
  'components-ui',
  'components-client',
  'components-forms',
  'components-patterns',
  'components-states',
];

const localElements = [
  { type: 'components-ui', pattern: 'src/features/*/components/ui' },
  { type: 'components-client', pattern: 'src/features/*/components/client' },
  { type: 'components-forms', pattern: 'src/features/*/components/forms' },
  { type: 'components-patterns', pattern: 'src/features/*/components/patterns' },
  { type: 'components-states', pattern: 'src/features/*/components/states' },
  { type: 'schemas', pattern: 'src/features/*/schemas' },
  { type: 'types', pattern: 'src/features/*/types' },
  { type: 'constants', pattern: 'src/features/*/constants' },
  { type: 'services', pattern: 'src/features/*/services' },
  { type: 'queries', pattern: 'src/features/*/queries' },
  { type: 'mutations', pattern: 'src/features/*/mutations' },
  { type: 'forms', pattern: 'src/features/*/forms' },
  { type: 'orchestration', pattern: 'src/features/*/orchestration' },
  { type: 'feature', pattern: 'src/features/*' },
  { type: 'features-root', pattern: 'src/features' },
  { type: 'shared-root', pattern: 'src/shared' },
  { type: 'shared', pattern: 'src/shared/**' },
  { type: 'app', pattern: 'src/app/**' },
];

const allow = (types) => ({ to: { element: { types: { anyOf: types } } } });
const allowFiles = (categories) => ({ to: { file: { categories: { anyOf: categories } } } });
const sharedTargetTypes = ['shared', 'shared-root'];
const layerTypes = [
  'feature',
  'schemas',
  'types',
  'constants',
  'services',
  'queries',
  'mutations',
  'forms',
  'orchestration',
  ...componentLayers,
  'app',
];

const dependencyPolicies = [
  { from: { file: { categories: 'root-barrel' } }, allow: allowFiles(['features-barrel', 'shared-barrel']) },
  { from: { file: { categories: 'features-barrel' } }, allow: allow(['feature']) },
  { from: { element: { type: 'feature' } }, allow: allow(['feature', ...componentLayers, 'schemas', 'types', 'constants', 'services', 'queries', 'mutations', 'forms', 'orchestration', ...sharedTargetTypes]) },
  { from: { element: { type: 'schemas' } }, allow: allow(['schemas', 'types', 'constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'types' } }, allow: allow(['types', 'schemas', 'constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'constants' } }, allow: allow(['constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'services' } }, allow: allow(['services', 'schemas', 'types', 'constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'queries' } }, allow: allow(['queries', 'services', 'schemas', 'types', 'constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'mutations' } }, allow: allow(['mutations', 'services', 'schemas', 'types', 'constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'forms' } }, allow: allow(['forms', 'schemas', 'types', 'constants', ...sharedTargetTypes]) },
  { from: { element: { type: 'orchestration' } }, allow: allow(['orchestration', 'forms', 'queries', 'mutations', 'schemas', 'types', 'constants', ...componentLayers, ...sharedTargetTypes]) },
  ...componentLayers.map((type) => ({
    from: { element: { type } },
    allow: allow([type, ...componentLayers, 'schemas', 'types', 'constants', ...sharedTargetTypes]),
  })),
  { from: { element: { type: 'shared' } }, allow: allow(['shared', 'shared-root']) },
  { from: { element: { type: 'shared-root' } }, allow: allow(['shared', 'shared-root']) },
  { from: { element: { type: 'app' } }, allow: allow(['app', 'feature', 'features-root', ...componentLayers, 'orchestration', ...sharedTargetTypes]) },
  { from: { element: { types: { anyOf: layerTypes } } }, allow: allowFiles(['shared-barrel']) },
  { disallow: { to: { file: { categories: ['test'] } } } },
];

const unsafeRules = {
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-declaration-merging': 'error',
  '@typescript-eslint/no-unsafe-enum-comparison': 'error',
  '@typescript-eslint/no-unsafe-function-type': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-type-assertion': 'error',
  '@typescript-eslint/no-unsafe-unary-minus': 'error',
};

export default defineConfig([
  globalIgnores([
    '**/.claude/**',
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/coverage/**',
    '**/node_modules/**',
    'next-env.d.ts',
  ]),
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: sourceFiles })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({ ...config, files: sourceFiles })),
  {
    files: sourceFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      boundaries,
      'check-file': checkFile,
      import: importPlugin,
      sonarjs,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: `${import.meta.dirname}/tsconfig.json`,
          alwaysTryTypes: true,
        },
      },
      'boundaries/elements': localElements,
      'boundaries/files': [
        { category: 'root-barrel', pattern: 'src/index.ts' },
        { category: 'features-barrel', pattern: 'src/features/index.ts' },
        { category: 'shared-barrel', pattern: 'src/shared/index.ts' },
        { category: 'test', pattern: '**/*.{test,spec}.{ts,tsx}' },
      ],
    },
    rules: {
      ...unsafeRules,
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-check': true,
        'ts-expect-error': true,
        'ts-ignore': true,
        'ts-nocheck': true,
      }],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'separate-type-imports' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'import', format: null },
        { selector: 'objectLiteralProperty', modifiers: ['requiresQuotes'], format: null },
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
        { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'PascalCase', 'UPPER_CASE'] },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'forbid' },
      ],
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowAny: false,
        allowNullableBoolean: false,
        allowNullableEnum: false,
        allowNullableNumber: false,
        allowNullableObject: false,
        allowNullableString: false,
        allowNumber: false,
        allowString: false,
      }],
      '@typescript-eslint/switch-exhaustiveness-check': ['error', {
        allowDefaultCaseForExhaustiveSwitch: false,
        considerDefaultExhaustiveForUnions: false,
        requireDefaultForNonUnion: true,
      }],
      'boundaries/dependencies': ['error', {
        checkUnknownLocals: true,
        default: 'disallow',
        policies: dependencyPolicies,
      }],
      'boundaries/no-unknown-dependencies': ['error', { require: 'element' }],
      'check-file/filename-blocklist': ['error', {
        '**/{common,helper,helpers,misc,util,utils}.{ts,tsx}': '*.feature.ts',
      }],
      'check-file/filename-naming-convention': ['error', {
        'src/**/*.{ts,tsx}': 'KEBAB_CASE',
      }, { ignoreMiddleExtensions: true }],
      'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE' }, { ignoreWords: ['[...path]'] }],
      complexity: ['error', 12],
      eqeqeq: ['error', 'always', { null: 'never' }],
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
      'import/no-self-import': 'error',
      'import/no-unresolved': ['error', { commonjs: true, amd: true }],
      'max-depth': ['error', 3],
      'max-lines': ['error', { max: 350, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'no-console': 'error',
      'no-nested-ternary': 'error',
      'no-restricted-imports': ['error', { patterns: frontendRestrictedImportPatterns }],
      'no-restricted-syntax': ['error', ...crossFolderImportSelectors],
      'sonarjs/cognitive-complexity': ['error', 12],
      '@next/next/no-async-client-component': 'error',
    },
  },
  {
    files: featureFiles,
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowAny: false,
        allowArray: false,
        allowBoolean: false,
        allowNever: false,
        allowNullish: false,
        allowNumber: true,
        allowRegExp: false,
      }],
      '@typescript-eslint/return-await': ['error', 'always'],
      'no-else-return': ['error', { allowElseIf: false }],
      'max-nested-callbacks': ['error', 2],
      'max-statements': ['error', 20],
      'no-magic-numbers': ['error', { detectObjects: true, enforceConst: true, ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true }],
      'no-param-reassign': ['error', { props: true }],
      'no-throw-literal': 'error',
      'no-restricted-syntax': [
        'error',
        ...crossFolderImportSelectors,
        { selector: 'TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration', message: 'Tipos de produção pertencem a *.types.ts, *.schema.ts ou *.props.ts.' },
      ],
    },
  },
  {
    files: dedicatedTypeFiles,
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      'no-restricted-syntax': ['error', ...crossFolderImportSelectors],
    },
  },
  {
    files: ['src/index.ts', 'src/features/index.ts', 'src/shared/index.ts'],
    rules: {
      '@typescript-eslint/consistent-type-exports': 'off',
    },
  },
  {
    files: ['src/features/**/services/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...frontendRestrictedImportPatterns,
          { group: ['react', 'react-dom', 'next', 'next/*', '@tanstack/*'], message: '[AF-ARCH-020] services não importam React, Next ou Query.' },
        ],
      }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history'],
    },
  },
  {
    files: ['src/features/**/components/{ui,client,forms}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          ...frontendRestrictedImportPatterns,
          { group: ['**/services/**', '**/queries/**', '**/mutations/**', '**/orchestration/**'], message: '[AF-ARCH-021] UI, client e form não acessam service, query, mutation ou orchestration.' },
        ],
      }],
      'no-restricted-globals': ['error', 'Date'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'A renderização não pode depender de aleatoriedade; gere o valor fora da árvore hidratada.' }],
    },
  },
  {
    files: ['src/features/**/orchestration/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [...frontendRestrictedImportPatterns, { group: ['**/services/**'] }] }],
      'no-restricted-globals': ['error', 'Date'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'A renderização não pode depender de aleatoriedade; gere o valor fora da árvore hidratada.' }],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/schemas/**', '**/types/**', '**/constants/**', '**/services/**', '**/queries/**', '**/mutations/**', '**/forms/**', '**/orchestration/**', '**/components/**'], message: '[AF-ARCH-022] app só consome barrels públicos por @<feature>, @ ou @shared.' },
        ],
      }],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
    },
  },
  { files: ['next.config.ts'], plugins: { application: { rules: { 'feature-contract': applicationFeatureContractRule } } }, rules: { 'application/feature-contract': 'error' } },
]);
