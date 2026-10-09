import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { collectReactImportNames } from "../collect-react-import-names.ts";
import { createRule } from "../create-rule.ts";

const HOOK_NAME = "useState";
/** Props that make an input controlled. */
const CONTROLLED_PROPS = new Set(["value", "checked", "selected"]);

/** `useState()`, `alias()`, `React.useState()`, with or without generics. */
function isStateCall(options: { node: TSESTree.Node; hookNames: Set<string> }): boolean {
  const { node, hookNames } = options;
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) return hookNames.has(callee.name);
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === HOOK_NAME
  );
}

/** The state value binding: `[value] = useState()` or `state = useState()`. */
function stateIdentifier(pattern: TSESTree.BindingName): TSESTree.Identifier | undefined {
  if (pattern.type === AST_NODE_TYPES.Identifier) return pattern;
  if (pattern.type !== AST_NODE_TYPES.ArrayPattern) return undefined;
  const first = pattern.elements[0];
  return first?.type === AST_NODE_TYPES.Identifier ? first : undefined;
}

/** Root identifier of `name`, `form.email`, `form?.email`, `name ?? ""`, `name as string`. */
function rootIdentifier(node: TSESTree.Node): TSESTree.Identifier | undefined {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      return node;
    case AST_NODE_TYPES.MemberExpression:
      return rootIdentifier(node.object);
    case AST_NODE_TYPES.ChainExpression:
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
      return rootIdentifier(node.expression);
    case AST_NODE_TYPES.LogicalExpression:
      return rootIdentifier(node.left);
    default:
      return undefined;
  }
}

export default createRule({
  name: "prefer-react-hook-form",
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce react-hook-form instead of useState for form field state.",
    },
    schema: [],
    messages: {
      preferReactHookForm:
        'Use react-hook-form instead of useState for form state: "{{name}}" controls an input. Expected: useForm() from "react-hook-form".',
    },
  },
  defaultOptions: [],
  create(context) {
    const hookNames = collectReactImportNames({ program: context.sourceCode.ast, importedName: HOOK_NAME });
    const stateDeclarators = new Map<TSESLint.Scope.Variable, TSESTree.VariableDeclarator>();
    const reported = new Set<TSESTree.VariableDeclarator>();

    return {
      VariableDeclarator(node) {
        if (!node.init || !isStateCall({ node: node.init, hookNames })) return;
        const identifier = stateIdentifier(node.id);
        if (!identifier) return;
        const variable = context.sourceCode
          .getDeclaredVariables(node)
          .find((declared) => declared.name === identifier.name);
        if (variable) stateDeclarators.set(variable, node);
      },
      JSXAttribute(node) {
        if (node.name.type !== AST_NODE_TYPES.JSXIdentifier) return;
        if (!CONTROLLED_PROPS.has(node.name.name)) return;
        if (node.value?.type !== AST_NODE_TYPES.JSXExpressionContainer) return;
        if (node.value.expression.type === AST_NODE_TYPES.JSXEmptyExpression) return;
        const identifier = rootIdentifier(node.value.expression);
        if (!identifier) return;
        const variable = ASTUtils.findVariable(context.sourceCode.getScope(identifier), identifier);
        const declarator = variable && stateDeclarators.get(variable);
        if (!declarator || reported.has(declarator)) return;
        reported.add(declarator);
        context.report({
          node: declarator,
          messageId: "preferReactHookForm",
          data: { name: identifier.name },
        });
      },
    };
  },
});
