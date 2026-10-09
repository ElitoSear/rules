import rule from "../../src/rules/enforce-combobox-items.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("enforce-combobox-items", rule, {
  valid: [
    "<Combobox items={options} />;",
    "<Combobox items={options}><ComboboxInput /></Combobox>;",
    "<Combobox {...comboboxProps} />;",
    "<UI.Combobox items={options} />;",
    "<ComboboxList>{(item) => <ComboboxItem value={item} />}</ComboboxList>;",
    "<ComboboxList>\n  {function render(item) { return <ComboboxItem value={item} />; }}\n</ComboboxList>;",
    "<ComboboxList>{renderItem}</ComboboxList>;",
    "<ComboboxList>{renderers.item}</ComboboxList>;",
    "<ComboboxList>{/* options */}{(item) => <ComboboxItem value={item} />}</ComboboxList>;",
    "<ComboboxList children={(item) => <ComboboxItem value={item} />} />;",
    "<ComboboxList {...listProps} />;",
    "<Select><option /></Select>;",
    "<ComboboxItem />;",
  ],
  invalid: [
    { code: "<Combobox />;", errors: [{ messageId: "missingItems" }] },
    {
      code: "<Combobox value={selected}><ComboboxInput /></Combobox>;",
      errors: [{ messageId: "missingItems" }],
    },
    { code: "<UI.Combobox />;", errors: [{ messageId: "missingItems" }] },
    { code: "<ComboboxList />;", errors: [{ messageId: "invalidListChild" }] },
    {
      code: "<ComboboxList><ComboboxItem /></ComboboxList>;",
      errors: [{ messageId: "invalidListChild" }],
    },
    {
      code: "<ComboboxList>{items.map((item) => <ComboboxItem value={item} />)}</ComboboxList>;",
      errors: [{ messageId: "invalidListChild" }],
    },
    {
      code: "<ComboboxList>{renderItem}{renderOther}</ComboboxList>;",
      errors: [{ messageId: "invalidListChild" }],
    },
    {
      code: "<ComboboxList>text</ComboboxList>;",
      errors: [{ messageId: "invalidListChild" }],
    },
    {
      code: "<ComboboxList children={<ComboboxItem />} />;",
      errors: [{ messageId: "invalidListChild" }],
    },
    {
      code: "<UI.ComboboxList><ComboboxItem /></UI.ComboboxList>;",
      errors: [{ messageId: "invalidListChild" }],
    },
  ],
});
