// @ts-check
import boundaries from '@boundaries/eslint-plugin';
import eslint from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const codeFiles = ['{src,test}/**/*.ts'];
const moduleFiles = ['src/modules/**/*.ts'];
const dedicatedTypeFiles = [
  'src/modules/**/*.types.ts',
  'src/modules/**/*.port.ts',
  'src/modules/**/*.dto.ts',
  'src/modules/**/*.event.ts',
  'src/modules/**/*.error.ts',
  'src/modules/**/*.schema.ts',
];
const backendDeepAliasRestriction = {
  regex: '^@/.+',
  message: '[AF-ARCH-IMPORT-002] Alias interno profundo é proibido. Use o barrel raiz exatamente como \'@\' somente na superfície externa; dentro das camadas DDD, importe pelo caminho relativo permitido pelo ADR-0010. Imports de plugins como @nestjs/* continuam permitidos.',
};

export default tseslint.config(
  { ignores: ['coverage/**', 'dist/**', 'generated/**', 'src/generated/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: codeFiles,
    plugins: { boundaries, 'check-file': checkFile, import: importPlugin },
    settings: {
      ...importPlugin.flatConfigs.typescript.settings,
      'import/resolver': { typescript: { project: import.meta.dirname + '/tsconfig.json' } },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/**/domain/**' },
        { type: 'application', pattern: 'src/**/application/**' },
        { type: 'infrastructure', pattern: 'src/**/infrastructure/**' },
        { type: 'interfaces', pattern: 'src/**/interfaces/**' },
      ],
      'boundaries/files': [{ category: 'test', pattern: '**/*.{spec,e2e-spec}.ts' }],
    },
    rules: {
      '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: false }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      'no-restricted-imports': ['error', { patterns: [backendDeepAliasRestriction] }],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'domain' } }, allow: [{ to: { element: { type: 'domain' } } }] },
            { from: { element: { type: 'application' } }, allow: [{ to: { element: { types: { anyOf: ['application', 'domain'] } } } }] },
            { from: { element: { type: 'infrastructure' } }, allow: [{ to: { element: { types: { anyOf: ['infrastructure', 'application', 'domain'] } } } }] },
            { from: { element: { type: 'interfaces' } }, allow: [{ to: { element: { types: { anyOf: ['interfaces', 'application', 'domain'] } } } }] },
            { from: { file: { categories: ['test'] } }, allow: [{ to: { element: { types: { anyOf: ['interfaces', 'application', 'domain', 'infrastructure'] } } } }] },
            { disallow: { to: { file: { categories: ['test'] } } } },
          ],
        },
      ],
      'check-file/filename-naming-convention': ['error', { '**/*.{ts,tsx}': 'KEBAB_CASE' }, { ignoreMiddleExtensions: true }],
      'check-file/filename-blocklist': ['error', {
        '**/{utils,util,helpers,helper,common,misc,manager}.{ts,tsx}': '*.feature.ts',
      }],
      'check-file/folder-naming-convention': ['error', { 'src/**/': 'KEBAB_CASE', 'test/**/': 'KEBAB_CASE' }],
      complexity: ['error', 12],
      'import/no-cycle': 'error',
      'max-depth': ['error', 3],
      'max-lines': ['error', { max: 350, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      'sonarjs/cognitive-complexity': ['error', 12],
    },
  },
  {
    files: moduleFiles,
    ignores: ['**/*.constants.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/return-await': ['error', 'always'],
      '@typescript-eslint/strict-boolean-expressions': ['error', { allowAny: false, allowNullableBoolean: false, allowNullableEnum: false, allowNullableNumber: false, allowNullableObject: false, allowNullableString: false, allowNumber: false, allowString: false }],
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { allowDefaultCaseForExhaustiveSwitch: false, considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true }],
      '@typescript-eslint/naming-convention': ['error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
        { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'forbid' }
      ],
      eqeqeq: ['error', 'always', { null: 'never' }],
      'max-nested-callbacks': ['error', 2],
      'max-statements': ['error', 20],
      'no-console': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-magic-numbers': ['error', { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, enforceConst: true, detectObjects: true }],
      'no-nested-ternary': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'IDs e aleatoriedade entram por port determinístico.' }],
      'no-throw-literal': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'TSInterfaceDeclaration, TSTypeAliasDeclaration, TSEnumDeclaration', message: 'Tipos, interfaces e enums de produção pertencem a um arquivo dedicado (*.types.ts, *.port.ts, *.dto.ts, *.event.ts, *.error.ts ou *.schema.ts).' },
      ],
    },
  },
  { files: dedicatedTypeFiles, rules: { 'no-restricted-syntax': 'off' } },
  {
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', { name: 'Date', message: 'Domínio recebe Clock por port; não lê relógio global.' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            backendDeepAliasRestriction,
            { group: ['**/application/**'] },
            { group: ['**/infrastructure/**'] },
            { group: ['**/interfaces/**'] },
            { group: ['@nestjs/*'] },
            { group: ['@prisma/*'] },
            { group: ['prisma'] },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/application/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [backendDeepAliasRestriction, { group: ['**/infrastructure/**'] }, { group: ['**/interfaces/**'] }, { group: ['@prisma/*'] }, { group: ['prisma'] }] }] },
  },
  {
    files: ['{src,test}/**/*.{spec,e2e-spec}.ts'],
    rules: { '@typescript-eslint/explicit-module-boundary-types': 'off', 'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['test/test-kit/rabbitmq-client.ts'],
    rules: { 'max-lines': ['error', { max: 850, skipBlankLines: true, skipComments: true }] },
  },
);
