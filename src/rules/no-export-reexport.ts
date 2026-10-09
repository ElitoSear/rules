import {
  AST_NODE_TYPES,
  ASTUtils,
  TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

export default createRule({
  name: "no-export-reexport",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow re-exporting imported symbols; export only what the module defines.",
    },
    schema: [],
    messages: {
      noExportFrom:
        "`export ... from` re-exports are not allowed. Import explicitly and export local definitions.",
      noReexportImportedSymbol:
        "Re-exporting imported symbol '{{name}}' is not allowed. Define and export it locally.",
    },
  },
  defaultOptions: [],
  create(context) {
    /** Uses scope analysis so imports declared after the export are found too. */
    function isImportedBinding(identifier: TSESTree.Identifier): boolean {
      const variable = ASTUtils.findVariable(
        context.sourceCode.getScope(identifier),
        identifier.name,
      );
      return (
        variable?.defs.some(
          (definition) =>
            definition.type === TSESLint.Scope.DefinitionType.ImportBinding,
        ) ?? false
      );
    }

    function reportIfImported(identifier: TSESTree.Identifier): void {
      if (!isImportedBinding(identifier)) return;
      context.report({
        node: identifier,
        messageId: "noReexportImportedSymbol",
        data: { name: identifier.name },
      });
    }

    return {
      ExportAllDeclaration(node) {
        context.report({ node, messageId: "noExportFrom" });
      },
      ExportNamedDeclaration(node) {
        if (node.source) {
          context.report({ node, messageId: "noExportFrom" });
          return;
        }
        // export import Alias = Namespace.Member;
        if (
          node.declaration?.type === AST_NODE_TYPES.TSImportEqualsDeclaration
        ) {
          context.report({
            node,
            messageId: "noReexportImportedSymbol",
            data: { name: node.declaration.id.name },
          });
          return;
        }
        for (const specifier of node.specifiers) {
          if (specifier.local.type === AST_NODE_TYPES.Identifier)
            reportIfImported(specifier.local);
        }
      },
      ExportDefaultDeclaration(node) {
        // export default imported; export default imported as Type
        let declaration: TSESTree.Node = node.declaration;
        while (
          declaration.type === AST_NODE_TYPES.TSAsExpression ||
          declaration.type === AST_NODE_TYPES.TSSatisfiesExpression ||
          declaration.type === AST_NODE_TYPES.TSNonNullExpression
        )
          declaration = declaration.expression;
        if (declaration.type === AST_NODE_TYPES.Identifier)
          reportIfImported(declaration);
      },
    };
  },
});
