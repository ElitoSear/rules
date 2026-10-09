import rule from "../../src/rules/rename-unused-underscore.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("rename-unused-underscore", rule, {
  valid: [
    "Array.from({ length }, (_unused, index) => index);",
    "const [, second] = pair;",
    // Read bindings and non-binding identifiers are untouched
    'import _ from "lodash"; _.map(items, render);',
    "const _ = load(); _.run();",
    "record._ = 1;",
    "const value = record._;",
    "const value = { _: 1 };",
    "function run(__) {}",
  ],
  invalid: [
    {
      code: "Array.from({ length }, (_, index) => index);",
      output: "Array.from({ length }, (_unused, index) => index);",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      code: "const [_, second] = pair;",
      output: "const [_unused, second] = pair;",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      code: "function run(_: number, value: string) { return value; }",
      output: "function run(_unused: number, value: string) { return value; }",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      code: "try { run(); } catch (_) { recover(); }",
      output: "try { run(); } catch (_unused) { recover(); }",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      code: "const { _, ...rest } = record;",
      output: "const { _: _unused, ...rest } = record;",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      code: "const { key: _ } = record;",
      output: "const { key: _unused } = record;",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      code: "entries.forEach(([_, value]) => use(value));",
      output: "entries.forEach(([_unused, value]) => use(value));",
      errors: [{ messageId: "renameUnderscore" }],
    },
    {
      // Renaming would shadow an outer `_unused`; report without a fix
      code: "const _unused = 1; items.map((_) => _unused);",
      output: null,
      errors: [{ messageId: "renameUnderscore" }],
    },
  ],
});
