import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Parsed contents of every `*.json` file in a locales directory. */
export function loadLocaleMessages(localesDirectory: string): unknown[] {
  let fileNames: string[];
  try {
    fileNames = readdirSync(localesDirectory).filter((fileName) =>
      fileName.endsWith(".json"),
    );
  } catch (error) {
    throw new Error(
      `enforce-i18n-snake-case-keys: localesPath "${localesDirectory}" is not a readable directory.`,
      { cause: error },
    );
  }
  return fileNames.map((fileName): unknown =>
    JSON.parse(readFileSync(path.join(localesDirectory, fileName), "utf8")),
  );
}

function hasKeyPath(messages: unknown, key: string): boolean {
  let current = messages;
  for (const segment of key.split(".")) {
    if (typeof current !== "object" || current === null) return false;
    if (!Object.hasOwn(current, segment)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return true;
}

/** True when `key` resolves in every locale; false when there are no locales. */
export function existsInEveryLocale(
  localeMessages: unknown[],
  key: string,
): boolean {
  return (
    localeMessages.length > 0 &&
    localeMessages.every((messages) => hasKeyPath(messages, key))
  );
}
