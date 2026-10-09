import rule from "../../src/rules/no-export-reexport.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-export-reexport", rule, {
  valid: [
    "export const value = 1;",
    "const value = 1; export { value };",
    "const value = 1; export { value as renamed };",
    "function build() {} export default build;",
    'import { helper } from "./helper.ts"; export const value = helper();',
    'import { helper } from "./helper.ts"; const wrapped = helper; export { wrapped };',
    'import { helper } from "./helper.ts"; export default function run() { return helper(); }',
    // A local shadowing an import name is a local definition
    'import { helper } from "./helper.ts"; function scope() { const helper = 1; return helper; } export { scope };',
  ],
  invalid: [
    {
      code: 'export * from "./module.ts";',
      errors: [{ messageId: "noExportFrom" }],
    },
    {
      code: 'export * as module from "./module.ts";',
      errors: [{ messageId: "noExportFrom" }],
    },
    {
      code: 'export { value } from "./module.ts";',
      errors: [{ messageId: "noExportFrom" }],
    },
    {
      code: 'export type { Value } from "./module.ts";',
      errors: [{ messageId: "noExportFrom" }],
    },
    {
      code: 'import { value } from "./module.ts"; export { value };',
      errors: [{ messageId: "noReexportImportedSymbol", data: { name: "value" } }],
    },
    {
      code: 'import { value as local } from "./module.ts"; export { local as renamed };',
      errors: [{ messageId: "noReexportImportedSymbol", data: { name: "local" } }],
    },
    {
      code: 'import type { Value } from "./module.ts"; export type { Value };',
      errors: [{ messageId: "noReexportImportedSymbol" }],
    },
    {
      code: 'import { type Value } from "./module.ts"; export { type Value };',
      errors: [{ messageId: "noReexportImportedSymbol" }],
    },
    {
      code: 'import * as module from "./module.ts"; export { module };',
      errors: [{ messageId: "noReexportImportedSymbol" }],
    },
    {
      code: 'import value from "./module.ts"; export default value;',
      errors: [{ messageId: "noReexportImportedSymbol" }],
    },
    {
      code: 'import value from "./module.ts"; export default value as unknown;',
      errors: [{ messageId: "noReexportImportedSymbol" }],
    },
    {
      // Export before import
      code: 'export { value }; import { value } from "./module.ts";',
      errors: [{ messageId: "noReexportImportedSymbol" }],
    },
    {
      code: 'import { first, second } from "./module.ts"; export { first, second };',
      errors: [
        { messageId: "noReexportImportedSymbol", data: { name: "first" } },
        { messageId: "noReexportImportedSymbol", data: { name: "second" } },
      ],
    },
    {
      code: 'import * as module from "./module.ts"; export import Member = module.Member;',
      errors: [{ messageId: "noReexportImportedSymbol", data: { name: "Member" } }],
    },
  ],
});
