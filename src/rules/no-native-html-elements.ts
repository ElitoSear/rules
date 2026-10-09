import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.ts";

type Replacement = { component: string; importPath: string };

/** shadcn's default alias for generated components. */
const DEFAULT_IMPORT_BASE = "@/components/ui";

/** Native tag -> [replacement component, module under the import base]. */
const DEFAULT_COMPONENTS: Record<string, readonly [string, string]> = {
  button: ["Button", "button"],
  dialog: ["Dialog", "dialog"],
  input: ["Input", "input"],
  label: ["Label", "label"],
  menu: [
    "DropdownMenu, ContextMenu, Menubar or NavigationMenu",
    "dropdown-menu, context-menu, menubar or navigation-menu",
  ],
  select: ["Select", "select"],
  option: ["SelectItem", "select"],
  progress: ["Progress", "progress"],
  table: ["Table", "table"],
  thead: ["TableHeader", "table"],
  tbody: ["TableBody", "table"],
  tfoot: ["TableFooter", "table"],
  tr: ["TableRow", "table"],
  th: ["TableHead", "table"],
  td: ["TableCell", "table"],
  caption: ["TableCaption", "table"],
  textarea: ["Textarea", "textarea"],
  hr: ["Separator", "separator"],
};

/** `type` attribute value on `<input>`/`<Input>` -> [replacement component, module under the import base]. */
const INPUT_TYPE_COMPONENTS: Record<string, readonly [string, string]> = {
  checkbox: ["Checkbox", "checkbox"],
  radio: ["RadioGroupItem", "radio-group"],
};

function toReplacements(options: {
  entries: Record<string, readonly [string, string]>;
  importBase: string;
}): Record<string, Replacement> {
  return Object.fromEntries(
    Object.entries(options.entries).map(([tag, [component, moduleName]]) => [
      tag,
      { component, importPath: `${options.importBase}/${moduleName}` },
    ]),
  );
}

const INPUT_TAGS = new Set(["input", "Input"]);
const LABEL_COMPONENTS = new Set(["Label"]);
const FIELD_CONTROL_COMPONENTS = new Set([
  "Input",
  "Textarea",
  "Select",
  "Checkbox",
  "RadioGroup",
  "Switch",
  "DatePicker",
]);

type Options = [
  { importBase?: string; components?: Record<string, Replacement>; ignore?: string[] },
];

function elementName(node: TSESTree.JSXOpeningElement): string | undefined {
  return node.name.type === AST_NODE_TYPES.JSXIdentifier ? node.name.name : undefined;
}

/** Static string value of an attribute: `type="checkbox"` or `type={"checkbox"}`. */
function staticAttributeValue(options: {
  node: TSESTree.JSXOpeningElement;
  name: string;
}): string | undefined {
  const attribute = options.node.attributes.find(
    (candidate): candidate is TSESTree.JSXAttribute =>
      candidate.type === AST_NODE_TYPES.JSXAttribute &&
      candidate.name.type === AST_NODE_TYPES.JSXIdentifier &&
      candidate.name.name === options.name,
  );
  const value = attribute?.value;
  if (value?.type === AST_NODE_TYPES.Literal && typeof value.value === "string") return value.value;
  if (
    value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
    value.expression.type === AST_NODE_TYPES.Literal &&
    typeof value.expression.value === "string"
  )
    return value.expression.value;
  return undefined;
}

function childElementNames(node: TSESTree.JSXElement): string[] {
  return node.children.flatMap((child) => {
    if (child.type !== AST_NODE_TYPES.JSXElement) return [];
    const name = elementName(child.openingElement);
    return name === undefined ? [] : [name];
  });
}

export default createRule<Options, "useComponent" | "useInputTypeComponent" | "useField">({
  name: "no-native-html-elements",
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow native HTML elements that have a shared design-system component.",
    },
    schema: [
      {
        type: "object",
        properties: {
          importBase: {
            type: "string",
            description: "Module path the design-system components are imported from, e.g. \"@/components/ui\".",
          },
          components: {
            type: "object",
            description: "Native tag -> replacement with its full import path; merged over the defaults.",
            additionalProperties: {
              type: "object",
              properties: {
                component: { type: "string" },
                importPath: { type: "string" },
              },
              required: ["component", "importPath"],
              additionalProperties: false,
            },
          },
          ignore: {
            type: "array",
            description: "Native tags allowed regardless of the mapping.",
            items: { type: "string" },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useComponent:
        'Use {{component}} instead of native <{{tag}}> (import from "{{importPath}}").',
      useInputTypeComponent:
        'Use {{component}} instead of <{{tag}} type="{{inputType}}"> (import from "{{importPath}}").',
      useField:
        'Use <Field> and <FieldLabel> from "{{importBase}}/field" instead of a <div> wrapping a label and a control.',
    },
  },
  defaultOptions: [{ importBase: DEFAULT_IMPORT_BASE, components: {}, ignore: [] }],
  create(context, [options]) {
    const importBase = options.importBase ?? DEFAULT_IMPORT_BASE;
    const components = {
      ...toReplacements({ entries: DEFAULT_COMPONENTS, importBase }),
      ...options.components,
    };
    const inputTypeComponents = toReplacements({ entries: INPUT_TYPE_COMPONENTS, importBase });
    const ignored = new Set(options.ignore);

    return {
      JSXOpeningElement(node) {
        const tag = elementName(node);
        if (tag === undefined || ignored.has(tag)) return;
        if (INPUT_TAGS.has(tag)) {
          const inputType = staticAttributeValue({ node, name: "type" });
          const replacement =
            inputType !== undefined && Object.hasOwn(inputTypeComponents, inputType)
              ? inputTypeComponents[inputType]
              : undefined;
          if (replacement) {
            context.report({
              node,
              messageId: "useInputTypeComponent",
              data: { tag, inputType, ...replacement },
            });
            return;
          }
        }
        const replacement = Object.hasOwn(components, tag) ? components[tag] : undefined;
        if (replacement)
          context.report({ node, messageId: "useComponent", data: { tag, ...replacement } });
      },
      JSXElement(node) {
        if (elementName(node.openingElement) !== "div") return;
        const names = childElementNames(node);
        if (
          names.some((name) => LABEL_COMPONENTS.has(name)) &&
          names.some((name) => FIELD_CONTROL_COMPONENTS.has(name))
        )
          context.report({
            node: node.openingElement,
            messageId: "useField",
            data: { importBase },
          });
      },
    };
  },
});
