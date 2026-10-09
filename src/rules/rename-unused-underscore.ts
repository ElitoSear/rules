import {
  AST_NODE_TYPES,
  ASTUtils,
  TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

const PLACEHOLDER = "_";
const RENAMED_IDENTIFIER = "_unused";

const RENAMABLE_DEFINITIONS = new Set<string>([
  TSESLint.Scope.DefinitionType.Parameter,
  TSESLint.Scope.DefinitionType.Variable,
  TSESLint.Scope.DefinitionType.CatchClause,
]);

/**
 * Replaces only the name: an identifier's range includes its type annotation.
 * `{ _ }` destructuring keeps its key: `{ _: _unused }`.
 */
function buildReplacement(identifier: TSESTree.Identifier): {
  range: TSESTree.Range;
  text: string;
} {
  const start = identifier.range[0];
  const range: TSESTree.Range = [start, start + PLACEHOLDER.length];
  const parent = identifier.parent;
  if (parent.type === AST_NODE_TYPES.Property && parent.shorthand)
    return { range, text: `${PLACEHOLDER}: ${RENAMED_IDENTIFIER}` };
  return { range, text: RENAMED_IDENTIFIER };
}

export default createRule({
  name: "rename-unused-underscore",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Rename unused `_` placeholder bindings to `_unused` so `id-length` passes.",
    },
    fixable: "code",
    schema: [],
    messages: {
      renameUnderscore: "Rename unused identifier `_` to `_unused`.",
    },
  },
  defaultOptions: [],
  create(context) {
    function checkVariable(options: {
      variable: TSESLint.Scope.Variable;
      scope: TSESLint.Scope.Scope;
    }): void {
      const { variable, scope } = options;
      // A read `_` is a real binding (e.g. lodash), not a placeholder.
      if (variable.references.some((reference) => reference.isRead())) return;
      const canRename =
        ASTUtils.findVariable(scope, RENAMED_IDENTIFIER) === null;
      for (const definition of variable.defs) {
        if (!RENAMABLE_DEFINITIONS.has(definition.type)) continue;
        const identifier = definition.name;
        if (identifier.type !== AST_NODE_TYPES.Identifier) continue;
        const replacement = buildReplacement(identifier);
        context.report({
          node: identifier,
          messageId: "renameUnderscore",
          fix: canRename
            ? (fixer) => fixer.replaceTextRange(replacement.range, replacement.text)
            : null,
        });
      }
    }

    return {
      "Program:exit"() {
        const scopeManager = context.sourceCode.scopeManager;
        if (!scopeManager) return;
        for (const scope of scopeManager.scopes) {
          const variable = scope.set.get(PLACEHOLDER);
          if (variable) checkVariable({ variable, scope });
        }
      },
    };
  },
});
