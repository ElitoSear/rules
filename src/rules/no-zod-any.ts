import {
  AST_NODE_TYPES,
  ASTUtils,
  TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

const BANNED_MEMBERS = new Set(["any", "ZodAny", "ZodTypeAny"]);
const NAMESPACE_EXPORTS = new Set(["z", "zod"]);

function isZodSource(source: string): boolean {
  return source === "zod" || source.startsWith("zod/");
}

function getStaticMemberName(
  node: TSESTree.MemberExpression,
): string | undefined {
  if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier)
    return node.property.name;
  if (
    node.computed &&
    node.property.type === AST_NODE_TYPES.Literal &&
    typeof node.property.value === "string"
  )
    return node.property.value;
  return undefined;
}

function getImportedName(specifier: TSESTree.ImportSpecifier): string {
  return specifier.imported.type === AST_NODE_TYPES.Identifier
    ? specifier.imported.name
    : specifier.imported.value;
}

export default createRule({
  name: "no-zod-any",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow zod `any()`, `ZodAny` and `ZodTypeAny`; use specific schemas instead.",
    },
    schema: [],
    messages: {
      noZodAny:
        "Avoid zod `{{name}}`. Use a specific schema (e.g. `z.string()`, `z.object()`, `z.union()`).",
    },
  },
  defaultOptions: [],
  create(context) {
    /** True when the identifier is bound to the zod namespace: `import { z }`, `import * as zod`, `import zod`. */
    function isZodNamespace(identifier: TSESTree.Identifier): boolean {
      const variable = ASTUtils.findVariable(
        context.sourceCode.getScope(identifier),
        identifier.name,
      );
      const definition = variable?.defs[0];
      if (definition?.type !== TSESLint.Scope.DefinitionType.ImportBinding)
        return false;
      const declaration = definition.parent;
      if (
        declaration.type !== AST_NODE_TYPES.ImportDeclaration ||
        !isZodSource(declaration.source.value)
      )
        return false;
      const specifier = definition.node;
      if (specifier.type === AST_NODE_TYPES.ImportSpecifier)
        return NAMESPACE_EXPORTS.has(getImportedName(specifier));
      return (
        specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier ||
        specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier
      );
    }

    function reportIfBanned(options: {
      node: TSESTree.Node;
      object: TSESTree.Node;
      name: string | undefined;
    }): void {
      if (options.name === undefined || !BANNED_MEMBERS.has(options.name))
        return;
      if (
        options.object.type !== AST_NODE_TYPES.Identifier ||
        !isZodNamespace(options.object)
      )
        return;
      context.report({
        node: options.node,
        messageId: "noZodAny",
        data: { name: options.name },
      });
    }

    return {
      MemberExpression(node) {
        reportIfBanned({
          node,
          object: node.object,
          name: getStaticMemberName(node),
        });
      },
      TSQualifiedName(node) {
        reportIfBanned({ node, object: node.left, name: node.right.name });
      },
      // import { any, ZodTypeAny as Loose } from "zod"
      ImportSpecifier(node) {
        const declaration = node.parent;
        if (
          declaration.type !== AST_NODE_TYPES.ImportDeclaration ||
          !isZodSource(declaration.source.value)
        )
          return;
        const name = getImportedName(node);
        if (BANNED_MEMBERS.has(name))
          context.report({ node, messageId: "noZodAny", data: { name } });
      },
    };
  },
});
