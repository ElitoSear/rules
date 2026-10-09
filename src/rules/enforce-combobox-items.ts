import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

/** Last segment of the tag: `Combobox`, `UI.Combobox` and `ui:Combobox` all name `Combobox`. */
function getTagName(name: TSESTree.JSXTagNameExpression): string {
  switch (name.type) {
    case AST_NODE_TYPES.JSXIdentifier:
      return name.name;
    case AST_NODE_TYPES.JSXMemberExpression:
      return name.property.name;
    case AST_NODE_TYPES.JSXNamespacedName:
      return name.name.name;
  }
}

function findAttribute(options: {
  element: TSESTree.JSXOpeningElement;
  name: string;
}): TSESTree.JSXAttribute | undefined {
  return options.element.attributes.find(
    (attribute): attribute is TSESTree.JSXAttribute =>
      attribute.type === AST_NODE_TYPES.JSXAttribute &&
      attribute.name.type === AST_NODE_TYPES.JSXIdentifier &&
      attribute.name.name === options.name,
  );
}

/** A spread such as `{...props}` may carry the prop, so it is trusted. */
function hasSpreadAttribute(element: TSESTree.JSXOpeningElement): boolean {
  return element.attributes.some(
    (attribute) => attribute.type === AST_NODE_TYPES.JSXSpreadAttribute,
  );
}

function isMeaningfulChild(child: TSESTree.JSXChild): boolean {
  if (child.type === AST_NODE_TYPES.JSXText) return child.value.trim() !== "";
  return !(
    child.type === AST_NODE_TYPES.JSXExpressionContainer &&
    child.expression.type === AST_NODE_TYPES.JSXEmptyExpression
  );
}

/** Functions inline, or references to one: `renderItem`, `renderers.item`. */
function isRenderFunction(expression: TSESTree.Node): boolean {
  return (
    expression.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    expression.type === AST_NODE_TYPES.FunctionExpression ||
    expression.type === AST_NODE_TYPES.Identifier ||
    expression.type === AST_NODE_TYPES.MemberExpression
  );
}

function hasRenderPropChild(element: TSESTree.JSXElement): boolean {
  const children = element.children.filter(isMeaningfulChild);
  if (children.length === 0) {
    // <ComboboxList children={(item) => ...} />
    const childrenAttribute = findAttribute({
      element: element.openingElement,
      name: "children",
    });
    return (
      childrenAttribute?.value?.type ===
        AST_NODE_TYPES.JSXExpressionContainer &&
      isRenderFunction(childrenAttribute.value.expression)
    );
  }
  const [onlyChild] = children;
  return (
    children.length === 1 &&
    onlyChild.type === AST_NODE_TYPES.JSXExpressionContainer &&
    isRenderFunction(onlyChild.expression)
  );
}

export default createRule({
  name: "enforce-combobox-items",
  meta: {
    type: "problem",
    docs: {
      description:
        "Require `items` on Combobox and a render-prop child in ComboboxList so native search filtering works.",
    },
    schema: [],
    messages: {
      missingItems:
        "Combobox must receive an 'items' prop to enable native search filtering.",
      invalidListChild:
        "ComboboxList children must be a single render-prop function (e.g. {(item) => <ComboboxItem .../>}).",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        const tagName = getTagName(opening.name);
        if (tagName === "Combobox") {
          if (
            !findAttribute({ element: opening, name: "items" }) &&
            !hasSpreadAttribute(opening)
          )
            context.report({ node: opening, messageId: "missingItems" });
          return;
        }
        if (tagName !== "ComboboxList") return;
        if (hasRenderPropChild(node) || hasSpreadAttribute(opening)) return;
        context.report({ node: opening, messageId: "invalidListChild" });
      },
    };
  },
});
