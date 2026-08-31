// ponytail: tailwind-merge/clsx are not installed; a plain join covers every
// className we compose here (no conflicting utility pairs). Swap for
// tailwind-merge if a future primitive needs real conflict resolution.
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
