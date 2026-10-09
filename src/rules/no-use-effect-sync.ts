import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { collectReactImportNames } from "../collect-react-import-names.ts";
import { createRule } from "../create-rule.ts";

const HOOK_NAME = "useEffect";

/** `useEffect()`, `alias()`, `React.useEffect()`, `React["useEffect"]()`. */
function isEffectCall(options: {
  node: TSESTree.CallExpression;
  hookNames: Set<string>;
}): boolean {
  const { node, hookNames } = options;
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) return hookNames.has(callee.name);
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  const property = callee.property;
  if (!callee.computed)
    return property.type === AST_NODE_TYPES.Identifier && property.name === HOOK_NAME;
  return property.type === AST_NODE_TYPES.Literal && property.value === HOOK_NAME;
}

export default createRule({
  name: "no-use-effect-sync",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow useEffect; derive values during render, use TanStack Query for fetching and useSyncExternalStore for subscriptions.",
    },
    schema: [],
    messages: {
      noUseEffect:
        "useEffect is not allowed. Derive the value during render, use useMemo, a `key` reset, TanStack Query or useSyncExternalStore instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const hookNames = collectReactImportNames({ program: context.sourceCode.ast, importedName: HOOK_NAME });
    return {
      CallExpression(node) {
        if (isEffectCall({ node, hookNames }))
          context.report({ node, messageId: "noUseEffect" });
      },
    };
  },
});
