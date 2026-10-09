/** Full key: dot-separated snake_case segments, optionally behind an i18next `namespace:` prefix. */
const SNAKE_CASE_KEY = /^(?:[a-z0-9_]+:)?[a-z0-9_]+(?:\.[a-z0-9_]+)*$/;

/** Static fragment of a template-literal key, which may start or end on a dot. */
const SNAKE_CASE_FRAGMENT = /^[a-z0-9_.:]*$/;

export function isSnakeCaseKey(key: string): boolean {
  return SNAKE_CASE_KEY.test(key);
}

export function isSnakeCaseFragment(fragment: string): boolean {
  return SNAKE_CASE_FRAGMENT.test(fragment);
}

function toSnakeCaseSegment(segment: string): string {
  return segment
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/** Converts camelCase, PascalCase, kebab-case and spaced segments, keeping the dot structure. */
export function toSnakeCaseKey(key: string): string {
  return key.split(".").map(toSnakeCaseSegment).join(".");
}
