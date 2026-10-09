import { parseForESLint } from "@typescript-eslint/parser";
import rule from "../../src/rules/enforce-locale-nesting.ts";
import { ruleTester } from "../rule-tester.ts";

const JSON_TYPES: Record<string, string> = {
  ExpressionStatement: "JSONExpressionStatement",
  ObjectExpression: "JSONObjectExpression",
  ArrayExpression: "JSONArrayExpression",
  Property: "JSONProperty",
  Literal: "JSONLiteral",
  Identifier: "JSONIdentifier",
};

interface Positioned {
  range: [number, number];
  loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

function shiftLeft(positioned: Positioned): void {
  positioned.range = [positioned.range[0] - 1, positioned.range[1] - 1];
  for (const position of [positioned.loc.start, positioned.loc.end]) {
    if (position.line === 1) position.column -= 1;
  }
}

/** Rewrites an ESTree node in place into jsonc-eslint-parser's JSON node shape. */
function toJsonNode(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  const node = value as Record<string, unknown> & Positioned & { type?: string };
  if (typeof node.type === "string") {
    shiftLeft(node);
    node.type = JSON_TYPES[node.type] ?? node.type;
  }
  for (const [field, child] of Object.entries(node)) {
    if (field === "parent" || field === "loc" || field === "range") continue;
    if (Array.isArray(child)) child.forEach(toJsonNode);
    else toJsonNode(child);
  }
}

/** Test stand-in for jsonc-eslint-parser: parses `(json)` and drops the parentheses. */
const jsonParser = {
  parseForESLint(code: string) {
    const result = parseForESLint(`(${code})`, { range: true, loc: true, tokens: true, comment: true });
    const { ast } = result;
    const statement = ast.body[0];
    if (statement?.type !== "ExpressionStatement") throw new Error("Expected a JSON document.");
    toJsonNode(statement);
    ast.tokens = ast.tokens.slice(1, -1);
    ast.tokens.forEach(shiftLeft);
    ast.comments.forEach(shiftLeft);
    ast.range = [0, code.length];
    ast.loc.end.column = ast.loc.end.line === 1 ? code.length : ast.loc.end.column;
    return {
      ast,
      visitorKeys: {
        Program: ["body"],
        JSONExpressionStatement: ["expression"],
        JSONObjectExpression: ["properties"],
        JSONArrayExpression: ["elements"],
        JSONProperty: ["key", "value"],
        JSONLiteral: [],
        JSONIdentifier: [],
      },
    };
  },
};
const json = { languageOptions: { parser: jsonParser } };

ruleTester.run("enforce-locale-nesting", rule, {
  valid: [
    { ...json, code: '{ "format": { "vertical": "V", "landscape": "L" } }' },
    { ...json, code: '{ "format_vertical": "V", "title": "T" }' },
    // An existing sibling named after the prefix keeps its companions flat.
    { ...json, code: '{ "format": "F", "format_vertical": "V", "format_landscape": "L" }' },
    // Leading underscores and trailing separators carry no prefix.
    { ...json, code: '{ "_a": 1, "_b": 2, "c_": 3, "c_d": 4 }' },
    {
      ...json,
      code: '{ "privacy": { "sections": { "data_a": 1, "data_b": 2 } } }',
      options: [{ ignore: ["privacy.sections.data"] }],
    },
    {
      ...json,
      code: '{ "workflow": { "task": { "error": { "x": { "a_b": 1, "a_c": 2 } } } } }',
      options: [{ ignoreSubtrees: ["workflow.task.error"] }],
    },
    "const messages = { format_vertical: 1, format_landscape: 2 };",
    'export default { format: { vertical: "V" } };',
  ],
  invalid: [
    {
      ...json,
      code: '{\n  "format_vertical": "V",\n  "format_landscape": "L"\n}',
      output: '{\n  "format": {\n    "vertical": "V",\n    "landscape": "L"\n  }\n}',
      errors: [
        {
          messageId: "shouldNest",
          data: { keys: "format_vertical, format_landscape", prefix: "format", path: "format" },
          line: 2,
        },
      ],
    },
    {
      // Nested groups report their full path; multi-line values are re-indented.
      ...json,
      code: '{\n  "editor": {\n    "save_now": {\n      "label": "S"\n    },\n    "save_later": "L"\n  }\n}',
      output:
        '{\n  "editor": {\n    "save": {\n      "now": {\n        "label": "S"\n      },\n      "later": "L"\n    }\n  }\n}',
      errors: [{ messageId: "shouldNest", data: { keys: "save_now, save_later", prefix: "save", path: "editor.save" } }],
    },
    {
      // Non-contiguous groups are reported without a fix.
      ...json,
      code: '{\n  "format_vertical": "V",\n  "title": "T",\n  "format_landscape": "L"\n}',
      output: null,
      errors: [{ messageId: "shouldNest" }],
    },
    {
      // Comments inside the group block the fix.
      ...json,
      code: '{\n  "format_vertical": "V", // vertical\n  "format_landscape": "L"\n}',
      output: null,
      errors: [{ messageId: "shouldNest" }],
    },
    {
      ...json,
      code: '{\n\t"format_vertical": "V",\n\t"format_landscape": "L"\n}',
      output: '{\n\t"format": {\n\t\t"vertical": "V",\n\t\t"landscape": "L"\n\t}\n}',
      errors: [{ messageId: "shouldNest" }],
    },
    {
      ...json,
      code: '{ "a_b": 1, "a_c": 2, "x_y": 3, "x_z": 4 }',
      output: '{ "a": {\n  "b": 1,\n  "c": 2\n}, "x": {\n  "y": 3,\n  "z": 4\n} }',
      errors: [{ messageId: "shouldNest" }, { messageId: "shouldNest" }],
    },
    {
      code: "({\n  format_vertical: 1,\n  format_landscape: 2,\n});",
      output: '({\n  "format": {\n    "vertical": 1,\n    "landscape": 2\n  },\n});',
      errors: [{ messageId: "shouldNest" }],
    },
    {
      code: 'export default {\n  "format_vertical": 1,\n  format_landscape: 2,\n} as const;',
      output: 'export default {\n  "format": {\n    "vertical": 1,\n    "landscape": 2\n  },\n} as const;',
      errors: [{ messageId: "shouldNest" }],
    },
  ],
});
