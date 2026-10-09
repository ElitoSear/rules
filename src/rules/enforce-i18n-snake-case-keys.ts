import path from "node:path";
import {
  ASTUtils,
  AST_NODE_TYPES,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";
import {
  existsInEveryLocale,
  loadLocaleMessages,
} from "./enforce-i18n-snake-case-keys/locale-messages.ts";
import {
  isSnakeCaseFragment,
  isSnakeCaseKey,
  toSnakeCaseKey,
} from "./enforce-i18n-snake-case-keys/snake-case.ts";

/**
 * What a local binding is in the translation setup:
 * - `translate`: callable with a key (`t`, next-intl `translations`); `prefix` is
 *   the namespace prepended to keys, `undefined` when it cannot be resolved statically.
 * - `instance`: i18next instance or `useTranslation()` result, translating through `.t(...)`.
 * - `factory`: produces a translate function when called.
 */
type Binding =
  | { kind: "translate"; prefix: string | undefined }
  | { kind: "instance" }
  | { kind: "factory"; library: "next-intl" | "react-i18next" };

type Options = [{ localesPath?: string }];
type MessageIds = "invalidKey" | "invalidKeyFragment" | "invalidNamespace";

const NEXT_INTL_SOURCES = new Set(["next-intl", "next-intl/server"]);
const NEXT_INTL_FACTORIES = new Set(["useTranslations", "getTranslations"]);
/** next-intl translator methods whose first argument is a key. */
const NEXT_INTL_KEY_METHODS = new Set(["rich", "markup", "raw", "has"]);

function isI18nextInstanceSource(source: string): boolean {
  return source === "i18next" || /(?:^|\/)i18n$/.test(source);
}

function isReactI18nextSource(source: string): boolean {
  return source.includes("i18n");
}

function importedName(specifier: TSESTree.ImportSpecifier): string {
  return specifier.imported.type === AST_NODE_TYPES.Identifier
    ? specifier.imported.name
    : specifier.imported.value;
}

function bindingForImport(
  source: string,
  specifier: TSESTree.ImportClause,
): Binding | undefined {
  if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) {
    return isI18nextInstanceSource(source) ? { kind: "instance" } : undefined;
  }
  const name = importedName(specifier);
  if (NEXT_INTL_SOURCES.has(source)) {
    return NEXT_INTL_FACTORIES.has(name)
      ? { kind: "factory", library: "next-intl" }
      : undefined;
  }
  if (source === "i18next" && name === "t") {
    return { kind: "translate", prefix: "" };
  }
  if (isReactI18nextSource(source) && name === "useTranslation") {
    return { kind: "factory", library: "react-i18next" };
  }
  return undefined;
}

function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  switch (node.type) {
    case AST_NODE_TYPES.AwaitExpression:
      return unwrapExpression(node.argument);
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSTypeAssertion:
      return unwrapExpression(node.expression);
    default:
      return node;
  }
}

function stringLiteralValue(node: TSESTree.Node): string | undefined {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? undefined;
  }
  return undefined;
}

/** The node holding a next-intl namespace: `useTranslations("ns")` or `getTranslations({ namespace: "ns" })`. */
function namespaceNode(
  call: TSESTree.CallExpression,
): TSESTree.Node | undefined {
  const argument = call.arguments[0];
  if (argument === undefined) return undefined;
  if (argument.type !== AST_NODE_TYPES.ObjectExpression) return argument;
  const property = argument.properties.find(
    (candidate): candidate is TSESTree.Property =>
      candidate.type === AST_NODE_TYPES.Property &&
      ASTUtils.getPropertyName(candidate) === "namespace",
  );
  return property?.value;
}

/** Namespace prefix of a next-intl translator; `""` when none is passed, `undefined` when dynamic. */
function nextIntlPrefix(call: TSESTree.CallExpression): string | undefined {
  const node = namespaceNode(call);
  if (node === undefined) return "";
  return stringLiteralValue(node);
}

function joinKey(prefix: string, key: string): string {
  return prefix === "" ? key : `${prefix}.${key}`;
}

function memberPropertyName(
  member: TSESTree.MemberExpression,
): string | undefined {
  if (!member.computed) {
    return member.property.type === AST_NODE_TYPES.Identifier
      ? member.property.name
      : undefined;
  }
  return stringLiteralValue(member.property);
}

export default createRule<Options, MessageIds>({
  name: "enforce-i18n-snake-case-keys",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce snake_case i18n translation keys and next-intl namespaces.",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          localesPath: {
            type: "string",
            description:
              "Locale JSON directory, relative to the lint cwd. Enables the autofix, which applies only when the snake_case key exists in every locale file.",
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalidKey:
        'Translation key "{{key}}" should use snake_case. Use "{{suggestion}}" instead.',
      invalidKeyFragment:
        'Translation key template part "{{key}}" should use snake_case.',
      invalidNamespace:
        'Translation namespace "{{key}}" should use snake_case. Use "{{suggestion}}" instead.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const bindings = new Map<TSESLint.Scope.Variable, Binding>();
    const reportedNodes = new Set<TSESTree.Node>();
    const localesDirectory =
      options.localesPath === undefined
        ? undefined
        : path.resolve(context.cwd, options.localesPath);
    let localeMessages: unknown[] | undefined;

    function keyExists(key: string): boolean {
      if (localesDirectory === undefined) return false;
      localeMessages ??= loadLocaleMessages(localesDirectory);
      return existsInEveryLocale(localeMessages, key);
    }

    function bindingOf(node: TSESTree.Node): Binding | undefined {
      if (node.type !== AST_NODE_TYPES.Identifier) return undefined;
      const variable = ASTUtils.findVariable(sourceCode.getScope(node), node);
      return variable === null ? undefined : bindings.get(variable);
    }

    function bind(entry: {
      declaration: TSESTree.Node;
      name: string;
      binding: Binding;
    }): void {
      const variable = sourceCode
        .getDeclaredVariables(entry.declaration)
        .find((candidate) => candidate.name === entry.name);
      if (variable !== undefined) bindings.set(variable, entry.binding);
    }

    /** Reports a non-snake_case string literal, fixing it when the snake_case key is known to exist. */
    function checkLiteral(literal: {
      node: TSESTree.Node;
      key: string;
      prefix: string | undefined;
      messageId: "invalidKey" | "invalidNamespace";
    }): void {
      const { node, key, prefix, messageId } = literal;
      if (key === "" || isSnakeCaseKey(key) || reportedNodes.has(node)) return;
      reportedNodes.add(node);
      const suggestion = toSnakeCaseKey(key);
      const fixable =
        prefix !== undefined && keyExists(joinKey(prefix, suggestion));
      const quote = sourceCode.getText(node).charAt(0);
      context.report({
        node,
        messageId,
        data: { key, suggestion },
        fix: fixable
          ? (fixer) => fixer.replaceText(node, `${quote}${suggestion}${quote}`)
          : null,
      });
    }

    function checkTemplate(node: TSESTree.TemplateLiteral): void {
      const invalid = node.quasis.find(
        (quasi) => !isSnakeCaseFragment(quasi.value.cooked ?? quasi.value.raw),
      );
      if (invalid === undefined || reportedNodes.has(node)) return;
      reportedNodes.add(node);
      context.report({
        node,
        messageId: "invalidKeyFragment",
        data: { key: invalid.value.raw },
      });
    }

    /** Resolves `const KEY = "..."` to its initializer. */
    function constantInitializer(
      node: TSESTree.Identifier,
    ): TSESTree.Expression | undefined {
      const variable = ASTUtils.findVariable(sourceCode.getScope(node), node);
      const definition = variable?.defs[0];
      if (definition?.node.type !== AST_NODE_TYPES.VariableDeclarator) {
        return undefined;
      }
      const declarator = definition.node;
      if (declarator.parent.kind !== "const") return undefined;
      return declarator.init ?? undefined;
    }

    function checkKey(node: TSESTree.Node, prefix: string | undefined): void {
      const expression = unwrapExpression(node);
      switch (expression.type) {
        case AST_NODE_TYPES.ConditionalExpression:
          checkKey(expression.consequent, prefix);
          checkKey(expression.alternate, prefix);
          return;
        case AST_NODE_TYPES.LogicalExpression:
          checkKey(expression.left, prefix);
          checkKey(expression.right, prefix);
          return;
        case AST_NODE_TYPES.Identifier: {
          const initializer = constantInitializer(expression);
          if (initializer !== undefined) checkKey(initializer, prefix);
          return;
        }
        case AST_NODE_TYPES.TemplateLiteral:
          if (expression.expressions.length > 0) {
            checkTemplate(expression);
            return;
          }
          break;
        default:
          break;
      }
      const key = stringLiteralValue(expression);
      if (key === undefined) return;
      checkLiteral({ node: expression, key, prefix, messageId: "invalidKey" });
    }

    function checkNamespace(call: TSESTree.CallExpression): void {
      const node = namespaceNode(call);
      if (node === undefined) return;
      const namespace = stringLiteralValue(node);
      if (namespace === undefined) return;
      checkLiteral({
        node,
        key: namespace,
        prefix: "",
        messageId: "invalidNamespace",
      });
    }

    function bindFactoryResult(factoryResult: {
      declarator: TSESTree.VariableDeclarator;
      call: TSESTree.CallExpression;
      library: "next-intl" | "react-i18next";
    }): void {
      const { declarator, call, library } = factoryResult;
      const target = declarator.id;
      if (target.type === AST_NODE_TYPES.Identifier) {
        bind({
          declaration: declarator,
          name: target.name,
          binding:
            library === "next-intl"
              ? { kind: "translate", prefix: nextIntlPrefix(call) }
              : { kind: "instance" },
        });
        return;
      }
      if (library !== "react-i18next") return;
      if (target.type !== AST_NODE_TYPES.ObjectPattern) return;
      // `useTranslation("ns")` selects an i18next namespace file, not a key path.
      const prefix = call.arguments.length === 0 ? "" : undefined;
      for (const property of target.properties) {
        if (property.type !== AST_NODE_TYPES.Property) continue;
        if (ASTUtils.getPropertyName(property) !== "t") continue;
        if (property.value.type !== AST_NODE_TYPES.Identifier) continue;
        bind({
          declaration: declarator,
          name: property.value.name,
          binding: { kind: "translate", prefix },
        });
      }
    }

    function checkMemberCall(
      call: TSESTree.CallExpression,
      callee: TSESTree.MemberExpression,
    ): void {
      const binding = bindingOf(callee.object);
      const method = memberPropertyName(callee);
      const argument = call.arguments[0];
      if (binding === undefined || argument === undefined) return;
      if (binding.kind === "instance" && method === "t") {
        checkKey(argument, "");
        return;
      }
      if (
        binding.kind === "translate" &&
        method !== undefined &&
        NEXT_INTL_KEY_METHODS.has(method)
      ) {
        checkKey(argument, binding.prefix);
      }
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        for (const specifier of node.specifiers) {
          const binding = bindingForImport(source, specifier);
          if (binding === undefined) continue;
          bind({
            declaration: specifier,
            name: specifier.local.name,
            binding,
          });
        }
      },

      VariableDeclarator(node) {
        if (node.init === null) return;
        const call = unwrapExpression(node.init);
        if (call.type !== AST_NODE_TYPES.CallExpression) return;
        const binding = bindingOf(call.callee);
        if (binding?.kind !== "factory") return;
        bindFactoryResult({ declarator: node, call, library: binding.library });
      },

      CallExpression(node) {
        const callee = unwrapExpression(node.callee);
        if (callee.type === AST_NODE_TYPES.MemberExpression) {
          checkMemberCall(node, callee);
          return;
        }
        const binding = bindingOf(callee);
        const argument = node.arguments[0];
        if (binding === undefined || argument === undefined) return;
        if (binding.kind === "translate") {
          checkKey(argument, binding.prefix);
          return;
        }
        if (binding.kind === "factory" && binding.library === "next-intl") {
          checkNamespace(node);
        }
      },
    };
  },
});
