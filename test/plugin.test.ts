import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import plugin from "../src/plugin.ts";

const ruleNames = readdirSync(new URL("../src/rules/", import.meta.url))
  .filter((fileName) => fileName.endsWith(".ts"))
  .map((fileName) => fileName.replace(/\.ts$/, ""));

test("plugin registers every rule file", () => {
  assert.deepEqual(Object.keys(plugin.rules).sort(), ruleNames.sort());
});

test("every rule has a description and a test file", () => {
  const testNames = new Set(
    readdirSync(new URL("./rules/", import.meta.url)).map((fileName) =>
      fileName.replace(/\.test\.ts$/, ""),
    ),
  );
  for (const [name, rule] of Object.entries(plugin.rules)) {
    assert.ok(rule.meta.docs?.description, `${name}: meta.docs.description`);
    assert.ok(testNames.has(name), `${name}: test file`);
  }
});
