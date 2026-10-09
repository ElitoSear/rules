import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

/**
 * Structural view shared by ESTree object literals and the JSON AST of
 * jsonc-eslint-parser (`JSONObjectExpression`, `JSONProperty`, ...), whose node
 * types are absent from TSESTree.
 */
interface LocaleNode {
  type: string;
  range: TSESTree.Range;
  loc: TSESTree.SourceLocation;
}

interface LocaleKey extends LocaleNode {
  value?: unknown;
  name?: unknown;
}

interface LocaleProperty extends LocaleNode {
  key: LocaleKey;
  value: LocaleNode;
  computed?: boolean;
}

interface LocaleObject extends LocaleNode {
  properties: LocaleNode[];
}

interface PrefixedProperty {
  key: string;
  suffix: string;
  property: LocaleProperty;
}

type Options = [{ ignore?: string[]; ignoreSubtrees?: string[] }];

const OBJECT_TYPES = new Set(["ObjectExpression", "JSONObjectExpression"]);
const PROPERTY_TYPES = new Set(["Property", "JSONProperty"]);
/** Wrappers between a statement and the locale object: `export default`, `as const`, `satisfies`. */
const WRAPPER_FIELDS: Record<string, "expression" | "declaration"> = {
  ExpressionStatement: "expression",
  JSONExpressionStatement: "expression",
  ExportDefaultDeclaration: "declaration",
  TSAsExpression: "expression",
  TSSatisfiesExpression: "expression",
};

function isLocaleObject(node: LocaleNode): node is LocaleObject {
  return OBJECT_TYPES.has(node.type);
}

function isLocaleProperty(node: LocaleNode): node is LocaleProperty {
  return PROPERTY_TYPES.has(node.type) && (node as LocaleProperty).computed !== true;
}

function propertyKey(property: LocaleProperty): string | undefined {
  const { key } = property;
  if (typeof key.value === "string") return key.value;
  if (key.type.endsWith("Identifier") && typeof key.name === "string") return key.name;
  return undefined;
}

/** The locale object a file holds: a JSON document, `({...})` or `export default {...}`. */
function rootObject(program: TSESTree.Program): LocaleObject | undefined {
  let current: LocaleNode | undefined = program.body[0];
  while (current !== undefined) {
    if (isLocaleObject(current)) return current;
    const field: "expression" | "declaration" | undefined = WRAPPER_FIELDS[current.type];
    if (field === undefined) return undefined;
    current = (current as unknown as Record<string, LocaleNode | undefined>)[field];
  }
  return undefined;
}

/** `"format_vertical"` -> prefix `"format"`, suffix `"vertical"`; keys without both parts have none. */
function splitPrefix(key: string): { prefix: string; suffix: string } | undefined {
  const separatorIndex = key.indexOf("_");
  if (separatorIndex <= 0 || separatorIndex === key.length - 1) return undefined;
  return { prefix: key.slice(0, separatorIndex), suffix: key.slice(separatorIndex + 1) };
}

function groupByPrefix(properties: LocaleProperty[]): Map<string, PrefixedProperty[]> {
  const groups = new Map<string, PrefixedProperty[]>();
  for (const property of properties) {
    const key = propertyKey(property);
    const parts = key === undefined ? undefined : splitPrefix(key);
    if (key === undefined || parts === undefined) continue;
    const group = groups.get(parts.prefix) ?? [];
    group.push({ key, suffix: parts.suffix, property });
    groups.set(parts.prefix, group);
  }
  return groups;
}

function isContiguous(siblings: LocaleNode[], group: PrefixedProperty[]): boolean {
  const positions = group.map(({ property }) => siblings.indexOf(property));
  return positions.every(
    (position, order) => order === 0 || position === (positions[order - 1] ?? -1) + 1,
  );
}

export default createRule<Options, "shouldNest">({
  name: "enforce-locale-nesting",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Flag sibling locale keys sharing a snake_case prefix that should be nested under it instead.",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          ignore: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
            description: 'Dot-separated group paths to skip, e.g. "privacy.sections.data".',
          },
          ignoreSubtrees: {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
            description:
              'Dot-separated object paths whose whole subtree is skipped, e.g. "workflow.task.error", for keys mirroring identifiers defined elsewhere.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      shouldNest:
        'Locale keys {{keys}} share the prefix "{{prefix}}", nest them under "{{path}}" instead.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const ignoredPaths = new Set(options.ignore);
    const ignoredSubtrees = new Set(options.ignoreSubtrees);
    const sourceCode = context.sourceCode;

    function indentationOf(node: LocaleNode): string {
      const line = sourceCode.lines[node.loc.start.line - 1] ?? "";
      return /^\s*/.exec(line)?.[0] ?? "";
    }

    /** Re-indents a (possibly multi-line) value one level deeper. */
    function indentValue(node: LocaleNode, indentUnit: string): string {
      return sourceCode.getText(node as TSESTree.Node).replace(/\n/g, `\n${indentUnit}`);
    }

    function hasCommentsWithin(range: TSESTree.Range): boolean {
      return sourceCode
        .getAllComments()
        .some((comment) => comment.range[0] >= range[0] && comment.range[1] <= range[1]);
    }

    /**
     * Rewrites the group as one nested property. Only offered when the group is
     * contiguous and comment-free, so no unrelated key moves and nothing is dropped.
     */
    function buildFix(fixGroup: {
      siblings: LocaleNode[];
      group: PrefixedProperty[];
      prefix: string;
    }): TSESLint.ReportFixFunction | null {
      const { siblings, group, prefix } = fixGroup;
      const first = group[0]?.property;
      const last = group.at(-1)?.property;
      if (first === undefined || last === undefined) return null;
      const range: TSESTree.Range = [first.range[0], last.range[1]];
      if (!isContiguous(siblings, group) || hasCommentsWithin(range)) return null;

      const baseIndent = indentationOf(first);
      const indentUnit = baseIndent.startsWith("\t") ? "\t" : "  ";
      const innerIndent = `${baseIndent}${indentUnit}`;
      const entries = group.map(
        ({ suffix, property }) =>
          `${innerIndent}${JSON.stringify(suffix)}: ${indentValue(property.value, indentUnit)}`,
      );
      const replacement = `${JSON.stringify(prefix)}: {\n${entries.join(",\n")}\n${baseIndent}}`;
      return (fixer) => fixer.replaceTextRange(range, replacement);
    }

    function checkObject(node: LocaleObject, path: string[]): void {
      if (ignoredSubtrees.has(path.join("."))) return;
      const properties = node.properties.filter(isLocaleProperty);
      const existingKeys = new Set(properties.map(propertyKey));

      for (const [prefix, group] of groupByPrefix(properties)) {
        // An existing `prefix` sibling means the flat keys are deliberate companions of it.
        if (group.length < 2 || existingKeys.has(prefix)) continue;
        const groupPath = [...path, prefix].join(".");
        if (ignoredPaths.has(groupPath)) continue;
        context.report({
          loc: group[0]?.property.loc ?? node.loc,
          messageId: "shouldNest",
          data: { keys: group.map(({ key }) => key).join(", "), prefix, path: groupPath },
          fix: buildFix({ siblings: node.properties, group, prefix }),
        });
      }

      for (const property of properties) {
        const key = propertyKey(property);
        if (key === undefined || !isLocaleObject(property.value)) continue;
        checkObject(property.value, [...path, key]);
      }
    }

    return {
      Program(node) {
        const root = rootObject(node);
        if (root !== undefined) checkObject(root, []);
      },
    };
  },
});
