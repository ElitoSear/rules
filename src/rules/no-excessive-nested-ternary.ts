import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

/** Default depth: a single ternary, no nesting. */
const DEFAULT_MAXIMUM_DEPTH = 1;

type Options = [{ maxDepth?: number }];

/** Skips TypeScript wrappers that do not break a ternary chain: `as`, `!`, `satisfies`, `<T>`. */
function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  switch (node.type) {
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSTypeAssertion:
      return unwrapExpression(node.expression);
    default:
      return node;
  }
}

function getTernaryDepth(node: TSESTree.Node): number {
  const expression = unwrapExpression(node);
  if (expression.type !== AST_NODE_TYPES.ConditionalExpression) return 0;
  return (
    1 +
    Math.max(
      getTernaryDepth(expression.test),
      getTernaryDepth(expression.consequent),
      getTernaryDepth(expression.alternate),
    )
  );
}

/** True when the ternary sits inside another ternary, so only the outermost one reports. */
function isNestedTernary(node: TSESTree.ConditionalExpression): boolean {
  let current: TSESTree.Node = node;
  let parent = node.parent;
  while (unwrapExpression(parent) !== parent) {
    current = parent;
    parent = parent.parent as TSESTree.Node;
  }
  return (
    parent.type === AST_NODE_TYPES.ConditionalExpression &&
    (parent.test === current ||
      parent.consequent === current ||
      parent.alternate === current)
  );
}

export default createRule<Options, "excessiveNesting">({
  name: "no-excessive-nested-ternary",
  meta: {
    type: "problem",
    docs: {
      description: "Limit the nesting depth of ternary operators.",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxDepth: {
            type: "integer",
            minimum: 1,
            description: "Maximum ternary chain depth; 1 = no nesting.",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      excessiveNesting:
        "Ternary nesting depth is limited to {{maximum}}; found {{depth}}. Use if/else, a lookup map or a switch.",
    },
  },
  defaultOptions: [{ maxDepth: DEFAULT_MAXIMUM_DEPTH }],
  create(context, [options]) {
    const maximumDepth = options.maxDepth ?? DEFAULT_MAXIMUM_DEPTH;
    return {
      ConditionalExpression(node) {
        if (isNestedTernary(node)) return;
        const depth = getTernaryDepth(node);
        if (depth <= maximumDepth) return;
        context.report({
          node,
          messageId: "excessiveNesting",
          data: { maximum: maximumDepth, depth },
        });
      },
    };
  },
});
