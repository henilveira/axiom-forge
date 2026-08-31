import { DEFAULT_BACKEND_PORT } from './backend.constants';

export function readBackendPort(
  env: NodeJS.ProcessEnv = process.env,
): string | number {
  return env['PORT'] ?? DEFAULT_BACKEND_PORT;
}
