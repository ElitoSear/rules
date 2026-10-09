import rule from "../../src/rules/no-native-html-elements.ts";
import { ruleTester } from "../rule-tester.ts";

function component(options: { tag: string; name: string; importPath: string }) {
  return {
    messageId: "useComponent" as const,
    data: { tag: options.tag, component: options.name, importPath: options.importPath },
  };
}

function repeated(count: number) {
  return Array.from({ length: count }, () => ({ messageId: "useComponent" as const }));
}

const link = { a: { component: "Link", importPath: "@repo/ui/link" } };

ruleTester.run("no-native-html-elements", rule, {
  valid: [
    "<Button>Save</Button>;",
    "<div><span /></div>;",
    "<Form.input />;",
    "<svg:circle />;",
    "<Input type='text' />;",
    { code: "<button />;", options: [{ ignore: ["button"] }] },
    "<div><Label /><span /></div>;",
    "<div><Label />{show && <Input />}</div>;",
  ],
  invalid: [
    {
      code: "<button>Save</button>;",
      options: [{ importBase: "@repo/ui/components/ui" }],
      errors: [
        component({ tag: "button", name: "Button", importPath: "@repo/ui/components/ui/button" }),
      ],
    },
    {
      code: "<input type=\"checkbox\" />;",
      options: [{ importBase: "~/ui" }],
      errors: [
        {
          messageId: "useInputTypeComponent",
          data: { tag: "input", inputType: "checkbox", component: "Checkbox", importPath: "~/ui/checkbox" },
        },
      ],
    },
    {
      code: "<button>Save</button>;",
      errors: [component({ tag: "button", name: "Button", importPath: "@/components/ui/button" })],
    },
    {
      code: "<input />;",
      errors: [component({ tag: "input", name: "Input", importPath: "@/components/ui/input" })],
    },
    {
      code: "<hr />;",
      errors: [component({ tag: "hr", name: "Separator", importPath: "@/components/ui/separator" })],
    },
    { code: "<select><option /></select>;", errors: repeated(2) },
    {
      code: "<table><thead><tr><th /></tr></thead><tbody><tr><td /></tr></tbody><tfoot /><caption /></table>;",
      errors: repeated(9),
    },
    { code: "<><textarea /><label /><dialog /><menu /><progress /></>;", errors: repeated(5) },
    { code: "<button {...props} />;", errors: repeated(1) },
    { code: "show ? <button /> : null;", errors: repeated(1) },
    {
      code: "<input type='checkbox' />;",
      errors: [
        {
          messageId: "useInputTypeComponent",
          data: {
            tag: "input",
            inputType: "checkbox",
            component: "Checkbox",
            importPath: "@/components/ui/checkbox",
          },
        },
      ],
    },
    { code: "<Input type={'checkbox'} />;", errors: [{ messageId: "useInputTypeComponent" }] },
    { code: "<input type='radio' />;", errors: [{ messageId: "useInputTypeComponent" }] },
    {
      code: "<a />;",
      options: [{ components: link }],
      errors: [component({ tag: "a", name: "Link", importPath: "@repo/ui/link" })],
    },
    { code: "<button />;", options: [{ components: link }], errors: repeated(1) },
    { code: "<div><Label>Name</Label><Input /></div>;", errors: [{ messageId: "useField" }] },
    { code: "<div><Label /><Switch /></div>;", errors: [{ messageId: "useField" }] },
  ],
});
