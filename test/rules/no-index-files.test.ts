import rule from "../../src/rules/no-index-files.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-index-files", rule, {
  valid: [
    { code: "export const value = 1;", filename: "src/user-list.ts" },
    { code: "export const value = 1;", filename: "src/indexer.ts" },
    { code: "export const value = 1;", filename: "src/index/user-list.ts" },
    { code: "export const value = 1;", filename: "src/reindex.tsx" },
  ],
  invalid: [
    {
      code: "export const value = 1;",
      filename: "src/index.ts",
      errors: [{ messageId: "noIndexFiles", line: 1, column: 1 }],
    },
    {
      code: "export const value = 1;",
      filename: "C:\\project\\src\\index.tsx",
      errors: [{ messageId: "noIndexFiles" }],
    },
    {
      code: "export type Value = number;",
      filename: "src/types/index.d.ts",
      errors: [{ messageId: "noIndexFiles" }],
    },
    {
      code: "export const value = 1;",
      filename: "src/Index.js",
      errors: [{ messageId: "noIndexFiles" }],
    },
  ],
});
