export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error != null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
