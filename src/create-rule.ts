import { ESLintUtils } from "@typescript-eslint/utils";

/** Builds a typed rule whose docs link points at the rule's README entry. */
export const createRule = ESLintUtils.RuleCreator(
  (ruleName) =>
    `https://github.com/ElitoSear/rules/blob/main/README.md#${ruleName}`,
);
