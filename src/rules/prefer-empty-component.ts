import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

type Emptiness = "empty" | "nonEmpty";
type Comparison = { operator: string; literal: number };

/** `length <operator> literal` comparisons and which side of emptiness they assert. */
const LENGTH_COMPARISONS: Array<Comparison & { emptiness: Emptiness }> = [
  { operator: "===", literal: 0, emptiness: "empty" },
  { operator: "==", literal: 0, emptiness: "empty" },
  { operator: "<=", literal: 0, emptiness: "empty" },
  { operator: "<", literal: 1, emptiness: "empty" },
  { operator: "!==", literal: 0, emptiness: "nonEmpty" },
  { operator: "!=", literal: 0, emptiness: "nonEmpty" },
  { operator: ">", literal: 0, emptiness: "nonEmpty" },
  { operator: ">=", literal: 1, emptiness: "nonEmpty" },
];

/** `0 < length` is `length > 0`. */
const MIRRORED_OPERATORS: Record<string, string> = {
  "===": "===",
  "==": "==",
  "!==": "!==",
  "!=": "!=",
  "<": ">",
  ">": "<",
  "<=": ">=",
  ">=": "<=",
};

const TRANSLATION_FUNCTIONS = new Set(["t", "translate"]);
/** Translation key segment naming an intentional empty state: `no_items`, `empty`, `list_empty`. */
const EMPTY_KEY_PATTERN = /(?:^|_)no_|empty/i;

const DEFAULT_IGNORED_COMPONENTS = ["Empty", "FieldError", "SelectItem"];

/** shadcn's default alias for generated components. */
const DEFAULT_IMPORT_BASE = "@/components/ui";

type Options = [{ importBase?: string; ignoreComponents?: string[] }];

/** `items.length`, `items?.length`, `items["length"]`. */
function isLengthAccess(node: TSESTree.Node): boolean {
  const expression = node.type === AST_NODE_TYPES.ChainExpression ? node.expression : node;
  if (expression.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (!expression.computed)
    return expression.property.type === AST_NODE_TYPES.Identifier && expression.property.name === "length";
  return expression.property.type === AST_NODE_TYPES.Literal && expression.property.value === "length";
}

function numericValue(node: TSESTree.Node): number | undefined {
  return node.type === AST_NODE_TYPES.Literal && typeof node.value === "number" ? node.value : undefined;
}

function comparisonEmptiness(node: TSESTree.BinaryExpression): Emptiness | undefined {
  const lengthOnLeft = isLengthAccess(node.left);
  if (!lengthOnLeft && !isLengthAccess(node.right)) return undefined;
  const literal = numericValue(lengthOnLeft ? node.right : node.left);
  const operator = lengthOnLeft ? node.operator : MIRRORED_OPERATORS[node.operator];
  return LENGTH_COMPARISONS.find(
    (comparison) => comparison.operator === operator && comparison.literal === literal,
  )?.emptiness;
}

/** Which side of emptiness a test asserts: comparisons, `!items.length`, bare `items.length`. */
function testEmptiness(node: TSESTree.Expression): Emptiness | undefined {
  if (node.type === AST_NODE_TYPES.BinaryExpression) return comparisonEmptiness(node);
  if (isLengthAccess(node)) return "nonEmpty";
  if (node.type !== AST_NODE_TYPES.UnaryExpression || node.operator !== "!") return undefined;
  const inner = testEmptiness(node.argument);
  if (inner === undefined) return undefined;
  return inner === "empty" ? "nonEmpty" : "empty";
}

function isJsx(node: TSESTree.Node | null | undefined): node is TSESTree.JSXElement | TSESTree.JSXFragment {
  return node?.type === AST_NODE_TYPES.JSXElement || node?.type === AST_NODE_TYPES.JSXFragment;
}

/** JSX returned by `return <X />` or the first top-level `return <X />` of a block. */
function returnedJsx(statement: TSESTree.Statement): TSESTree.JSXElement | TSESTree.JSXFragment | undefined {
  const statements = statement.type === AST_NODE_TYPES.BlockStatement ? statement.body : [statement];
  for (const candidate of statements) {
    if (candidate.type === AST_NODE_TYPES.ReturnStatement && isJsx(candidate.argument))
      return candidate.argument;
  }
  return undefined;
}

function someDescendant(options: {
  node: TSESTree.Node;
  visitorKeys: TSESLint.SourceCode.VisitorKeys;
  predicate: (node: TSESTree.Node) => boolean;
}): boolean {
  const { node, visitorKeys, predicate } = options;
  if (predicate(node)) return true;
  const record = node as unknown as Record<string, unknown>;
  for (const key of visitorKeys[node.type] ?? []) {
    const children = ([] as unknown[]).concat(record[key]);
    for (const child of children) {
      if (child && typeof child === "object" && "type" in child)
        if (someDescendant({ node: child as TSESTree.Node, visitorKeys, predicate })) return true;
    }
  }
  return false;
}

function isTranslationWithEmptyKey(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  if (node.callee.type !== AST_NODE_TYPES.Identifier || !TRANSLATION_FUNCTIONS.has(node.callee.name))
    return false;
  const lastArgument = node.arguments.at(-1);
  if (lastArgument?.type !== AST_NODE_TYPES.Literal || typeof lastArgument.value !== "string") return false;
  const key = lastArgument.value.split(".").at(-1) ?? lastArgument.value;
  return EMPTY_KEY_PATTERN.test(key);
}

export default createRule<Options, "useEmpty" | "useEmptyOrDisable">({
  name: "prefer-empty-component",
  meta: {
    type: "suggestion",
    docs: {
      description: "Suggest the <Empty> component for empty-list placeholder renders.",
    },
    schema: [
      {
        type: "object",
        properties: {
          importBase: {
            type: "string",
            description: "Module path the design-system components are imported from, e.g. \"@/components/ui\".",
          },
          ignoreComponents: {
            type: "array",
            description: "Component name prefixes whose presence marks the placeholder as already handled.",
            items: { type: "string" },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useEmpty:
        'This is an empty placeholder. Use <Empty> from "{{importBase}}/empty" for consistent styling.',
      useEmptyOrDisable:
        'This looks like an empty placeholder. Use <Empty> from "{{importBase}}/empty" for consistent styling, or disable this line if it is not one.',
    },
  },
  defaultOptions: [{ importBase: DEFAULT_IMPORT_BASE, ignoreComponents: DEFAULT_IGNORED_COMPONENTS }],
  create(context, [options]) {
    const importBase = options.importBase ?? DEFAULT_IMPORT_BASE;
    const ignoreComponents = options.ignoreComponents ?? DEFAULT_IGNORED_COMPONENTS;
    const visitorKeys = context.sourceCode.visitorKeys;

    function isIgnoredComponent(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.JSXOpeningElement) return false;
      if (node.name.type !== AST_NODE_TYPES.JSXIdentifier) return false;
      const name = node.name.name;
      return ignoreComponents.some((prefix) => name.startsWith(prefix));
    }

    function report(node: TSESTree.Node | null | undefined): void {
      if (!isJsx(node)) return;
      if (someDescendant({ node, visitorKeys, predicate: isIgnoredComponent })) return;
      const confirmed = someDescendant({ node, visitorKeys, predicate: isTranslationWithEmptyKey });
      context.report({
        node,
        messageId: confirmed ? "useEmpty" : "useEmptyOrDisable",
        data: { importBase },
      });
    }

    return {
      LogicalExpression(node) {
        if (node.operator === "&&" && testEmptiness(node.left) === "empty") report(node.right);
      },
      ConditionalExpression(node) {
        const emptiness = testEmptiness(node.test);
        if (emptiness === "empty") report(node.consequent);
        if (emptiness === "nonEmpty") report(node.alternate);
      },
      IfStatement(node) {
        const emptiness = testEmptiness(node.test);
        // `if (empty) return <X />` without else; with an else the consequent may be anything.
        if (emptiness === "empty" && node.alternate === null) report(returnedJsx(node.consequent));
        if (emptiness === "nonEmpty" && node.alternate !== null) report(returnedJsx(node.alternate));
      },
    };
  },
});
