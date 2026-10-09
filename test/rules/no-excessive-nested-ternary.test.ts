import rule from "../../src/rules/no-excessive-nested-ternary.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-excessive-nested-ternary", rule, {
  valid: [
    "const value = condition ? first : second;",
    "const value = condition ? first : second; const other = check ? third : fourth;",
    // A ternary inside a callback is its own scope of logic
    "const value = condition ? items.map((item) => item.active ? 1 : 0) : [];",
    "const value = condition ? (first as number) : second;",
  ],
  invalid: [
    {
      code: "const value = first ? second ? third : fourth : fifth;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 2 } }],
    },
    {
      code: "const value = first ? second : third ? fourth : fifth;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 2 } }],
    },
    {
      // Reported once, on the outermost ternary
      code: "const value = first ? second ? third ? fourth : fifth : sixth : seventh;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 3 } }],
    },
    {
      code: "const value = (first ? second : third) ? fourth : fifth;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 2 } }],
    },
    {
      code: "const value = first ? (second ? third : fourth) as number : fifth;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 2 } }],
    },
    {
      code: "const value = first ? (second ? third : fourth)! : fifth;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 2 } }],
    },
    {
      code: "const element = <div>{first ? <span /> : second ? <b /> : null}</div>;",
      errors: [{ messageId: "excessiveNesting", data: { maximum: 1, depth: 2 } }],
    },
  ],
});
