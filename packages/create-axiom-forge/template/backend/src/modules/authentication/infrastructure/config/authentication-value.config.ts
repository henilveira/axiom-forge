export function requiredConfigText(
  value: string | undefined,
  name: string,
): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}
