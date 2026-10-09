import { createRequire } from "node:module";

import enforceComboboxItems from "./rules/enforce-combobox-items.ts";
import enforceI18nSnakeCaseKeys from "./rules/enforce-i18n-snake-case-keys.ts";
import enforceLocaleNesting from "./rules/enforce-locale-nesting.ts";
import noAbbreviationsInArrowFunctions from "./rules/no-abbreviations-in-arrow-functions.ts";
import noExcessiveNestedTernary from "./rules/no-excessive-nested-ternary.ts";
import noExportReexport from "./rules/no-export-reexport.ts";
import noIife from "./rules/no-iife.ts";
import noIndexFiles from "./rules/no-index-files.ts";
import noNativeHtmlElements from "./rules/no-native-html-elements.ts";
import noUseEffectSync from "./rules/no-use-effect-sync.ts";
import noZodAny from "./rules/no-zod-any.ts";
import preferEmptyComponent from "./rules/prefer-empty-component.ts";
import preferReactHookForm from "./rules/prefer-react-hook-form.ts";
import preferTanstackQuery from "./rules/prefer-tanstack-query.ts";
import renameUnusedUnderscore from "./rules/rename-unused-underscore.ts";

const require = createRequire(import.meta.url);
const { name, version } = require("../package.json") as { name: string; version: string };

export const rules = {
  "enforce-combobox-items": enforceComboboxItems,
  "enforce-i18n-snake-case-keys": enforceI18nSnakeCaseKeys,
  "enforce-locale-nesting": enforceLocaleNesting,
  "no-abbreviations-in-arrow-functions": noAbbreviationsInArrowFunctions,
  "no-excessive-nested-ternary": noExcessiveNestedTernary,
  "no-export-reexport": noExportReexport,
  "no-iife": noIife,
  "no-index-files": noIndexFiles,
  "no-native-html-elements": noNativeHtmlElements,
  "no-use-effect-sync": noUseEffectSync,
  "no-zod-any": noZodAny,
  "prefer-empty-component": preferEmptyComponent,
  "prefer-react-hook-form": preferReactHookForm,
  "prefer-tanstack-query": preferTanstackQuery,
  "rename-unused-underscore": renameUnusedUnderscore,
};

export default { meta: { name, version }, rules };
