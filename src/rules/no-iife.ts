import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

type FunctionNode =
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.FunctionExpression ||
    node.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** Unwraps parentheses-free wrappers TypeScript keeps: `(fn as T)()`, `fn!()`, `(fn satisfies T)()`. */
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

type Options = [{ allowAsync?: boolean }];

const INVOKING_METHODS = new Set(["call", "apply"]);

export default createRule<Options, "noIife">({
  name: "no-iife",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow immediately invoked function expressions; use a named function, a block scope or a module.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowAsync: {
            type: "boolean",
            description: "Allow immediately invoked async functions.",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noIife: "Immediately invoked function expressions are not allowed.",
    },
  },
  defaultOptions: [{ allowAsync: false }],
  create(context, [options]) {
    const isReported = (functionNode: FunctionNode): boolean =>
      !(options.allowAsync === true && functionNode.async);
    return {
      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (isFunctionNode(callee)) {
          if (isReported(callee)) context.report({ node, messageId: "noIife" });
          return;
        }
        // (function () {}).call(this), (() => {}).apply(null, args), fn["call"]()
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        const method = callee.computed
          ? callee.property.type === AST_NODE_TYPES.Literal
            ? String(callee.property.value)
            : undefined
          : callee.property.type === AST_NODE_TYPES.Identifier
            ? callee.property.name
            : undefined;
        const invoked = unwrapExpression(callee.object);
        if (
          method !== undefined &&
          INVOKING_METHODS.has(method) &&
          isFunctionNode(invoked) &&
          isReported(invoked)
        )
          context.report({ node, messageId: "noIife" });
      },
    };
  },
});
