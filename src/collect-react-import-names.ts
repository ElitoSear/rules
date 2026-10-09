import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

/**
 * Local names bound to a named export of "react": the export name itself plus
 * any `import { importedName as alias } from "react"`.
 */
export function collectReactImportNames(options: {
  program: TSESTree.Program;
  importedName: string;
}): Set<string> {
  const names = new Set([options.importedName]);
  for (const statement of options.program.body) {
    if (statement.type !== AST_NODE_TYPES.ImportDeclaration) continue;
    if (statement.source.value !== "react") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) continue;
      const exportedName =
        specifier.imported.type === AST_NODE_TYPES.Identifier
          ? specifier.imported.name
          : specifier.imported.value;
      if (exportedName === options.importedName) names.add(specifier.local.name);
    }
  }
  return names;
}
