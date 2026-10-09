import { RuleTester } from "@typescript-eslint/rule-tester";
import { after, describe, it } from "node:test";

RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** Shared tester: TSX parsing so every rule can be exercised on TypeScript and JSX. */
export const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});
