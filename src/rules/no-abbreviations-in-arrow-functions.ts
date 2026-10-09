import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import pluralize from "pluralize";
import { createRule } from "../create-rule.ts";

/** Words of camelCase, PascalCase, snake_case and SCREAMING_CASE names. */
const WORD_PATTERN = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|d+/g;

/** Plurals the library gets wrong or that read better unchanged, keyed by lowercase plural. */
const SINGULAR_OVERRIDES = new Map([
  ["data", "data"],
  ["caches", "cache"],
]);

function singularizeWord(word: string): string {
  const lowerCaseWord = word.toLowerCase();
  return SINGULAR_OVERRIDES.get(lowerCaseWord) ?? pluralize.singular(lowerCaseWord);
}

/** Words of a collection name with the last one singular: `previousClients` -> previous, client. */
function getSingularWords(name: string): string[] {
  const words = name.match(WORD_PATTERN) ?? [name];
  const lastWord = words.pop();
  return lastWord === undefined ? words : [...words, singularizeWord(lastWord)];
}

function getInitials(words: string[]): string {
  return words.map((word) => word.charAt(0).toLowerCase()).join("");
}

function toCamelCase(words: string[]): string {
  return words
    .map((word, position) =>
      position === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}

/** Collection name from `users`, `this.users`, `state.users`, `getUsers()` is ignored. */
function getCollectionName(node: TSESTree.Expression): string | undefined {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name;
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier
  )
    return node.property.name;
  if (
    node.type === AST_NODE_TYPES.TSNonNullExpression ||
    node.type === AST_NODE_TYPES.TSAsExpression ||
    node.type === AST_NODE_TYPES.TSSatisfiesExpression
  )
    return getCollectionName(node.expression);
  return undefined;
}

/** The parameter bound to the collection element: `(user)`, `(user = fallback)`. */
function getElementParameter(
  node: TSESTree.ArrowFunctionExpression,
): TSESTree.Identifier | undefined {
  const [parameter] = node.params;
  if (parameter?.type === AST_NODE_TYPES.Identifier) return parameter;
  if (
    parameter?.type === AST_NODE_TYPES.AssignmentPattern &&
    parameter.left.type === AST_NODE_TYPES.Identifier
  )
    return parameter.left;
  return undefined;
}

export default createRule({
  name: "no-abbreviations-in-arrow-functions",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow arrow callback parameters abbreviated from the collection name (`users.map((u) => ...)`).",
    },
    schema: [],
    messages: {
      abbreviatedParameter:
        'Parameter "{{name}}" abbreviates "{{expected}}". Use the full name.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ArrowFunctionExpression(node) {
        // users.map(cb), users?.map(cb), this.users.forEach(cb)
        const call = node.parent;
        if (
          call.type !== AST_NODE_TYPES.CallExpression ||
          !call.arguments.includes(node) ||
          call.callee.type !== AST_NODE_TYPES.MemberExpression
        )
          return;
        const collectionName = getCollectionName(call.callee.object);
        if (collectionName === undefined) return;
        const parameter = getElementParameter(node);
        if (parameter === undefined) return;
        const singularWords = getSingularWords(collectionName);
        const expected = toCamelCase(singularWords);
        // Only all-lowercase names are abbreviations: `pwc`, `u`; `user` is the full word.
        const name = parameter.name;
        if (name !== name.toLowerCase() || name === expected) return;
        if (name !== getInitials(singularWords)) return;
        context.report({
          node: parameter,
          messageId: "abbreviatedParameter",
          data: { name, expected },
        });
      },
    };
  },
});
