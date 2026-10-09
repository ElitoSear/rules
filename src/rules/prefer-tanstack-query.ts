import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { collectReactImportNames } from "../collect-react-import-names.ts";
import { createRule } from "../create-rule.ts";

const HOOK_NAME = "useEffect";
/** Calls by bare name that perform a request. */
const REQUEST_FUNCTIONS = ["fetch", "axios", "ky"];
/** Objects whose method calls perform a request. */
const REQUEST_CLIENTS = ["axios", "supabase", "ky"];
/** HTTP-verb and query-builder methods. */
const REQUEST_METHODS = ["get", "post", "put", "patch", "delete", "from", "rpc"];

type Options = [{ requestFunctions?: string[]; requestClients?: string[]; requestMethods?: string[] }];

type RequestMatchers = { functions: Set<string>; clients: Set<string>; methods: Set<string> };

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
function isRequestCall(options: {
  node: TSESTree.CallExpression;
  matchers: RequestMatchers;
}): boolean {
  const { node, matchers } = options;
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) return matchers.functions.has(callee.name);
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.object.type === AST_NODE_TYPES.Identifier && matchers.clients.has(callee.object.name))
    return true;
  const property = memberPropertyName(callee);
  return property !== undefined && matchers.methods.has(property);
}

function isThenCall(node: TSESTree.CallExpression): boolean {
  return node.callee.type === AST_NODE_TYPES.MemberExpression && memberPropertyName(node.callee) === "then";
}

type EffectFrame = { node: TSESTree.CallExpression; isAsync: boolean; requests: boolean };

function stringListSchema(description: string) {
  return { type: "array" as const, items: { type: "string" as const }, uniqueItems: true, description };
}

export default createRule<Options, "preferTanstackQuery">({
  name: "prefer-tanstack-query",
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer TanStack Query over useEffect for data fetching.",
    },
    schema: [
      {
        type: "object",
        properties: {
          requestFunctions: stringListSchema("Bare call names that make a request; replaces default list."),
          requestClients: stringListSchema("Objects whose method calls make a request; replaces default list."),
          requestMethods: stringListSchema("Method names that make a request on any object; replaces default list."),
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferTanstackQuery:
        "Prefer TanStack Query (useQuery/useMutation) over useEffect for data fetching.",
    },
  },
  defaultOptions: [
    {
      requestFunctions: REQUEST_FUNCTIONS,
      requestClients: REQUEST_CLIENTS,
      requestMethods: REQUEST_METHODS,
    },
  ],
  create(context, [options]) {
    const matchers: RequestMatchers = {
      functions: new Set(options.requestFunctions ?? REQUEST_FUNCTIONS),
      clients: new Set(options.requestClients ?? REQUEST_CLIENTS),
      methods: new Set(options.requestMethods ?? REQUEST_METHODS),
    };
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
        if (isRequestCall({ node, matchers })) frame.requests = true;
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
