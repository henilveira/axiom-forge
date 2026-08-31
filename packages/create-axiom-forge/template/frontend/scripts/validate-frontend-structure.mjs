import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRootDirectory = dirname(scriptDirectory);
const codeExtensions = new Set(['.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const ignoredDirectoryNames = new Set([
  '.claude',
  '.git',
  '.next',
  'build',
  'coverage',
  'fixtures',
  'mocks',
  'node_modules',
  'out',
  'test',
  'tests',
  '__mocks__',
  '__tests__',
]);
const componentFolders = new Set(['client', 'forms', 'patterns', 'states', 'ui']);
const propsFolders = new Set(['client', 'forms', 'patterns', 'states', 'ui']);

const toPosix = (value) => value.split('/').join('/');

const isTestOrGeneratedFile = (fileName) =>
  fileName === 'next-env.d.ts' ||
  fileName.endsWith('.d.ts') ||
  fileName.endsWith('.test.ts') ||
  fileName.endsWith('.test.tsx') ||
  fileName.endsWith('.spec.ts') ||
  fileName.endsWith('.spec.tsx') ||
  fileName.endsWith('.stories.ts') ||
  fileName.endsWith('.stories.tsx');

const isProductionCodeFile = (fileName) => {
  const extension = fileName.slice(fileName.lastIndexOf('.'));
  return codeExtensions.has(extension) && !isTestOrGeneratedFile(fileName);
};

const shouldIgnorePath = (pathParts) => pathParts.some((part) => ignoredDirectoryNames.has(part));

const collectProductionFiles = (directory, rootDirectory) => {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    const pathParts = relative(rootDirectory, entryPath).split('/');
    if (shouldIgnorePath(pathParts)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectProductionFiles(entryPath, rootDirectory));
    } else if (entry.isFile() && isProductionCodeFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
};

const relativePath = (rootDirectory, path) => toPosix(relative(rootDirectory, path));

const addIssue = (issues, code, path, message) => {
  issues.push(`${code} ${path}: ${message}`);
};

const checkFileLocations = (files, srcDirectory, issues) => {
  for (const file of files) {
    const fileName = file.slice(file.lastIndexOf('/') + 1);
    const fileDirectory = dirname(file);
    const parentDirectory = fileDirectory.slice(fileDirectory.lastIndexOf('/') + 1);
    const filePath = relativePath(srcDirectory, file);
    const pathParts = filePath.split('/');

    if (fileName.endsWith('.schema.ts')) {
      if (parentDirectory !== 'schemas') {
        addIssue(issues, 'AF-ARCH-001', filePath, '*.schema.ts deve estar diretamente em schemas/.');
      } else if (!/\b(?:from|import)\s*\(?\s*['"]zod['"]/.test(readFileSync(file, 'utf8'))) {
        addIssue(issues, 'AF-ARCH-002', filePath, 'schemas devem importar zod para fazer parsing do contrato.');
      }
    }

    if (fileName.endsWith('.types.ts') && parentDirectory !== 'types') {
      addIssue(issues, 'AF-ARCH-003', filePath, '*.types.ts deve estar diretamente em types/.');
    }

    if (fileName.endsWith('.props.ts') && !propsFolders.has(parentDirectory)) {
      addIssue(
        issues,
        'AF-ARCH-004',
        filePath,
        '*.props.ts só pode viver em components/ui, components/client, components/forms, components/patterns ou components/states.',
      );
    }

    if (fileName.endsWith('.constants.ts') && parentDirectory !== 'constants') {
      addIssue(issues, 'AF-ARCH-005', filePath, '*.constants.ts deve estar diretamente em constants/.');
    }

    const componentsIndex = pathParts.indexOf('components');
    if (componentsIndex >= 0 && fileName !== 'index.ts') {
      const componentFolder = pathParts[componentsIndex + 1];
      if (!componentFolder || !componentFolders.has(componentFolder)) {
        addIssue(
          issues,
          'AF-ARCH-006',
          filePath,
          'componentes de produção devem estar em components/ui, components/client, components/forms, components/patterns ou components/states.',
        );
      }
    }
  }
};

const collectCodeDirectories = (directory, rootDirectory) => {
  if (!existsSync(directory)) {
    return [];
  }

  const directories = [];
  const files = collectProductionFiles(directory, rootDirectory);
  if (files.length > 0) {
    directories.push(directory);
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirectoryNames.has(entry.name)) {
      continue;
    }
    directories.push(...collectCodeDirectories(join(directory, entry.name), rootDirectory));
  }

  return directories;
};

const barrelExportsFile = (barrelContents, fileName) => {
  const baseName = fileName.slice(0, fileName.lastIndexOf('.'));
  const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bfrom\\s+['"]\\./${escapedBaseName}(?:['"]|\\.)`).test(barrelContents);
};

const barrelExportsTarget = (barrelContents, targetName) => {
  const escapedTargetName = targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\bfrom\\s+['"]\\./${escapedTargetName}(?:['"]|\\/)`).test(barrelContents);
};

const checkBarrels = (directories, rootDirectory, issues) => {
  for (const directory of directories) {
    const entries = readdirSync(directory, { withFileTypes: true });
    const publicFiles = entries
      .filter((entry) => entry.isFile() && entry.name !== 'index.ts' && isProductionCodeFile(entry.name))
      .map((entry) => entry.name);
    const publicDirectories = entries
      .filter((entry) => entry.isDirectory() && !ignoredDirectoryNames.has(entry.name))
      .filter((entry) => collectProductionFiles(join(directory, entry.name), rootDirectory).length > 0)
      .map((entry) => entry.name);
    const directoryPath = relativePath(rootDirectory, directory);
    const barrelPath = join(directory, 'index.ts');

    if (!existsSync(barrelPath)) {
      addIssue(issues, 'AF-ARCH-007', directoryPath, 'toda pasta de código deve ter index.ts.');
      continue;
    }

    const barrelContents = readFileSync(barrelPath, 'utf8');
    for (const publicFile of publicFiles) {
      if (!barrelExportsFile(barrelContents, publicFile)) {
        addIssue(issues, 'AF-ARCH-008', join(directoryPath, publicFile), 'index.ts deve reexportar o arquivo público da própria pasta.');
      }
    }
    for (const publicDirectory of publicDirectories) {
      if (!barrelExportsTarget(barrelContents, publicDirectory)) {
        addIssue(issues, 'AF-ARCH-008', join(directoryPath, publicDirectory), 'index.ts deve reexportar o barrel público da subpasta.');
      }
    }
  }
};

const readJson = (filePath, issues) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    addIssue(issues, 'AF-ARCH-009', relativePath(dirname(filePath), filePath), `JSON inválido: ${error.message}`);
    return {};
  }
};

const checkFeatureAliases = (featuresDirectory, rootDirectory, issues) => {
  if (!existsSync(featuresDirectory)) {
    return;
  }

  const featureDirectories = readdirSync(featuresDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !ignoredDirectoryNames.has(entry.name))
    .map((entry) => join(featuresDirectory, entry.name))
    .filter((directory) => collectProductionFiles(directory, rootDirectory).length > 0);

  if (featureDirectories.length === 0) {
    return;
  }

  const issuesBeforeConfig = issues.length;
  const tsconfigPath = join(rootDirectory, 'tsconfig.json');
  const nextConfigPath = join(rootDirectory, 'next.config.ts');
  const tsconfig = readJson(tsconfigPath, issues);
  const nextConfig = existsSync(nextConfigPath) ? readFileSync(nextConfigPath, 'utf8') : '';
  const paths = tsconfig.compilerOptions?.paths ?? {};

  for (const featureDirectory of featureDirectories) {
    const featureName = featureDirectory.slice(featureDirectory.lastIndexOf('/') + 1);
    const alias = `@${featureName}`;
    const expectedTarget = `./src/features/${featureName}/index.ts`;
    const tsconfigTargets = paths[alias];
    if (!Array.isArray(tsconfigTargets) || tsconfigTargets.length !== 1 || tsconfigTargets[0] !== expectedTarget) {
      addIssue(issues, 'AF-ARCH-010', relativePath(rootDirectory, featureDirectory), `tsconfig.json deve declarar o alias exato ${alias} para ${expectedTarget}.`);
    }

    const aliasPattern = new RegExp(`['"]${alias}['"]\\s*:\\s*['"]${expectedTarget.replaceAll('/', '\\/') }['"]`);
    if (!/turbopack\s*:\s*\{[\s\S]*resolveAlias\s*:\s*\{/.test(nextConfig) || !aliasPattern.test(nextConfig)) {
      addIssue(issues, 'AF-ARCH-011', relativePath(rootDirectory, featureDirectory), `next.config.ts deve declarar ${alias} em turbopack.resolveAlias.`);
    }
  }

  if (issues.length === issuesBeforeConfig && !existsSync(nextConfigPath)) {
    addIssue(issues, 'AF-ARCH-011', 'next.config.ts', 'turbopack.resolveAlias é obrigatório quando há features.');
  }
};

const checkInteractiveFeatures = (featuresDirectory, rootDirectory, issues) => {
  if (!existsSync(featuresDirectory)) {
    return;
  }

  for (const entry of readdirSync(featuresDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const featureDirectory = join(featuresDirectory, entry.name);
    const files = collectProductionFiles(featureDirectory, rootDirectory);
    if (files.length === 0) {
      continue;
    }

    const interactive = files.some((file) => {
      const featurePath = relativePath(featureDirectory, file).split('/');
      return (
        featurePath.includes('mutations') ||
        featurePath.includes('forms') ||
        featurePath.includes('client') ||
        /^['"]use client['"]/.test(readFileSync(file, 'utf8').trim())
      );
    });
    const orchestrationDirectory = join(featureDirectory, 'orchestration');
    if (interactive && collectProductionFiles(orchestrationDirectory, rootDirectory).length === 0) {
      addIssue(issues, 'AF-ARCH-012', relativePath(rootDirectory, featureDirectory), 'feature interativa deve ter orchestration/ com código e barrel.');
    }
  }
};

export const validateStructure = ({ rootDirectory = defaultRootDirectory } = {}) => {
  const srcDirectory = join(rootDirectory, 'src');
  const featuresDirectory = join(srcDirectory, 'features');
  const sharedDirectory = join(srcDirectory, 'shared');
  const issues = [];
  const scopedFiles = [
    ...collectProductionFiles(featuresDirectory, srcDirectory),
    ...collectProductionFiles(sharedDirectory, srcDirectory),
  ];

  checkFileLocations(scopedFiles, srcDirectory, issues);
  checkBarrels(
    [
      ...collectCodeDirectories(featuresDirectory, srcDirectory),
      ...collectCodeDirectories(sharedDirectory, srcDirectory),
    ],
    srcDirectory,
    issues,
  );
  checkFeatureAliases(featuresDirectory, rootDirectory, issues);
  checkInteractiveFeatures(featuresDirectory, srcDirectory, issues);

  if (issues.length > 0) {
    throw new Error(['Frontend structure validation failed:', ...issues].join('\n'));
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const rootArgumentIndex = process.argv.indexOf('--root');
    const requestedRoot = rootArgumentIndex >= 0 ? process.argv[rootArgumentIndex + 1] : undefined;
    if (rootArgumentIndex >= 0 && !requestedRoot) {
      throw new Error('AF-ARCH-013 --root exige um diretório de projeto.');
    }
    validateStructure({ rootDirectory: requestedRoot ? resolve(requestedRoot) : defaultRootDirectory });
    console.log('AF-ARCH-000 Frontend structure is valid.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
