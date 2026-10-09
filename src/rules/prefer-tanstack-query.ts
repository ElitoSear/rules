import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { collectReactImportNames } from "../collect-react-import-names.ts";
import { createRule } from "../create-rule.ts";

const HOOK_NAME = "useEffect";
/** Calls by bare name that perform a request. */
const REQUEST_FUNCTIONS = new Set(["fetch", "axios", "ky"]);
/** Objects whose method calls perform a request. */
const REQUEST_CLIENTS = new Set(["axios", "supabase", "ky"]);
/** HTTP-verb and query-builder methods. */
const REQUEST_METHODS = new Set(["get", "post", "put", "patch", "delete", "from", "rpc"]);

function memberPropertyName(node: TSESTree.MemberExpression): string | undefined {
  if (!node.computed)
    return node.property.type === AST_NODE_TYPES.Identifier ? node.property.name : undefined;
  return node.property.type === AST_NODE_TYPES.Literal && typeof node.property.value === "string"
    ? node.property.value
    : undefined;
}

function isEffectCall(options: {
  node: TSESTree.CallExpression;
  hookNames: Set<string>;
}): boolean {
  const { node, hookNames } = options;
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) return hookNames.has(callee.name);
  return callee.type === AST_NODE_TYPES.MemberExpression && memberPropertyName(callee) === HOOK_NAME;
}

/** `fetch()`, `axios()`, `axios.get()`, `supabase.from()`, `client.post()`. */
function isRequestCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) return REQUEST_FUNCTIONS.has(callee.name);
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.object.type === AST_NODE_TYPES.Identifier && REQUEST_CLIENTS.has(callee.object.name))
    return true;
  const property = memberPropertyName(callee);
  return property !== undefined && REQUEST_METHODS.has(property);
}

function isThenCall(node: TSESTree.CallExpression): boolean {
  return node.callee.type === AST_NODE_TYPES.MemberExpression && memberPropertyName(node.callee) === "then";
}

type EffectFrame = { node: TSESTree.CallExpression; isAsync: boolean; requests: boolean };

export default createRule({
  name: "prefer-tanstack-query",
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer TanStack Query over useEffect for data fetching.",
    },
    schema: [],
    messages: {
      preferTanstackQuery:
        "Prefer TanStack Query (useQuery/useMutation) over useEffect for data fetching.",
    },
  },
  defaultOptions: [],
  create(context) {
    const hookNames = collectReactImportNames({ program: context.sourceCode.ast, importedName: HOOK_NAME });
    // Innermost useEffect being traversed; asynchrony and requests anywhere inside count towards it.
    const frames: EffectFrame[] = [];
    const current = (): EffectFrame | undefined => frames[frames.length - 1];

    function markAsync(node: TSESTree.FunctionLike): void {
      const frame = current();
      if (frame && node.async) frame.isAsync = true;
    }

    return {
      CallExpression(node) {
        if (isEffectCall({ node, hookNames })) {
          frames.push({ node, isAsync: false, requests: false });
          return;
        }
        const frame = current();
        if (!frame) return;
        if (isThenCall(node)) frame.isAsync = true;
        if (isRequestCall(node)) frame.requests = true;
      },
      "CallExpression:exit"(node: TSESTree.CallExpression) {
        const frame = current();
        if (frame?.node !== node) return;
        frames.pop();
        if (frame.isAsync && frame.requests)
          context.report({ node, messageId: "preferTanstackQuery" });
      },
      AwaitExpression() {
        const frame = current();
        if (frame) frame.isAsync = true;
      },
      ArrowFunctionExpression: markAsync,
      FunctionExpression: markAsync,
      FunctionDeclaration: markAsync,
    };
  },
});
