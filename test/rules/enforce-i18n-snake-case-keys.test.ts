import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after } from "node:test";
import rule from "../../src/rules/enforce-i18n-snake-case-keys.ts";
import { ruleTester } from "../rule-tester.ts";

const localesDirectory = await mkdtemp(path.join(tmpdir(), "i18n-snake-case-"));
const messages = {
  apply_changes: "Apply",
  common: { save_button: "Save" },
  pricing_page: { save_vs_monthly: "Save" },
};
await writeFile(path.join(localesDirectory, "en.json"), JSON.stringify(messages));
await writeFile(path.join(localesDirectory, "es.json"), JSON.stringify(messages));
after(() => rm(localesDirectory, { recursive: true, force: true }));

const withLocales: [{ localesPath: string }] = [{ localesPath: localesDirectory }];
const reactI18next = 'import { useTranslation } from "react-i18next";\n';
const nextIntl = 'import { useTranslations, getTranslations } from "next-intl/server";\n';

ruleTester.run("enforce-i18n-snake-case-keys", rule, {
  valid: [
    `${reactI18next}const { t } = useTranslation(); t("apply_changes"); t("json_builder.select_field");`,
    `${reactI18next}const { t: translate } = useTranslation(); translate("a.b_c", { count: 1 });`,
    `${nextIntl}const translations = useTranslations("pricing_page"); translations("save_vs_monthly");`,
    `${nextIntl}const translations = useTranslations(); translations(\`items.\${id}.question\`);`,
    `${reactI18next}const { t } = useTranslation(); t(message || "");`,
    `import i18n from "../lib/i18n"; i18n.t("notifications.task.paused.title");`,
    `import i18n from "i18next"; i18n.t("common:save_button");`,
    // Untracked functions are ignored.
    `const t = (key) => key; t("applyChanges");`,
    `function render(t) { return t("applyChanges"); }`,
    `import { format } from "date-fns"; format("YYYY");`,
  ],
  invalid: [
    {
      code: `${reactI18next}const { t } = useTranslation(); t("applyChanges");`,
      errors: [{ messageId: "invalidKey", data: { key: "applyChanges", suggestion: "apply_changes" } }],
    },
    {
      code: `${reactI18next}const { t } = useTranslation(); t("applyChanges");`,
      options: withLocales,
      output: `${reactI18next}const { t } = useTranslation(); t("apply_changes");`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `${reactI18next}const { t: translate } = useTranslation(); translate('Apply-Changes');`,
      options: withLocales,
      output: `${reactI18next}const { t: translate } = useTranslation(); translate('apply_changes');`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      // No fix when the snake_case key is absent from the locales.
      code: `${reactI18next}const { t } = useTranslation(); t("jsonSchemaBuilder.selectField");`,
      options: withLocales,
      errors: [{ messageId: "invalidKey", data: { key: "jsonSchemaBuilder.selectField", suggestion: "json_schema_builder.select_field" } }],
    },
    {
      // react-i18next namespace argument makes the key path unknown, so no fix.
      code: `${reactI18next}const { t } = useTranslation("common"); t("applyChanges");`,
      options: withLocales,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `${reactI18next}const translation = useTranslation(); translation.t("applyChanges");`,
      options: withLocales,
      output: `${reactI18next}const translation = useTranslation(); translation.t("apply_changes");`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `import { useTranslation } from "../hooks/use-i18n"; const { t } = useTranslation(); t("applyChanges");`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `${nextIntl}const translations = useTranslations("pricing_page"); translations("saveVsMonthly");`,
      options: withLocales,
      output: `${nextIntl}const translations = useTranslations("pricing_page"); translations("save_vs_monthly");`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `${nextIntl}async function Page() { const translations = await getTranslations({ locale, namespace: "pricing_page" }); return translations.rich("saveVsMonthly"); }`,
      options: withLocales,
      output: `${nextIntl}async function Page() { const translations = await getTranslations({ locale, namespace: "pricing_page" }); return translations.rich("save_vs_monthly"); }`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `${nextIntl}const translations = useTranslations("PricingPage");`,
      options: withLocales,
      output: `${nextIntl}const translations = useTranslations("pricing_page");`,
      errors: [{ messageId: "invalidNamespace", data: { key: "PricingPage", suggestion: "pricing_page" } }],
    },
    {
      code: `${nextIntl}const translations = await getTranslations({ namespace: "Pricing" });`,
      errors: [{ messageId: "invalidNamespace" }],
    },
    {
      code: `${nextIntl}const translations = useTranslations(); translations(\`sections.\${id}.sectionTitle\`);`,
      errors: [{ messageId: "invalidKeyFragment", data: { key: ".sectionTitle" } }],
    },
    {
      code: `${nextIntl}const translations = useTranslations(); translations(\`applyChanges\`);`,
      options: withLocales,
      output: `${nextIntl}const translations = useTranslations(); translations(\`apply_changes\`);`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `import i18n from "../lib/i18n"; i18n.t("Notifications.TaskPaused");`,
      errors: [{ messageId: "invalidKey", data: { key: "Notifications.TaskPaused", suggestion: "notifications.task_paused" } }],
    },
    {
      code: `import i18next from "i18next"; i18next["t"]("applyChanges");`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `import { t } from "i18next"; t("JSONSchema");`,
      errors: [{ messageId: "invalidKey", data: { key: "JSONSchema", suggestion: "json_schema" } }],
    },
    {
      code: `${reactI18next}const KEY = "applyChanges"; const { t } = useTranslation(); t(KEY); t(KEY);`,
      options: withLocales,
      output: `${reactI18next}const KEY = "apply_changes"; const { t } = useTranslation(); t(KEY); t(KEY);`,
      errors: [{ messageId: "invalidKey" }],
    },
    {
      code: `${reactI18next}const { t } = useTranslation(); t(done ? "applyChanges" : "discard-changes");`,
      errors: [{ messageId: "invalidKey" }, { messageId: "invalidKey" }],
    },
    {
      code: `${reactI18next}const { t } = useTranslation(); t("applyChanges" as const);`,
      errors: [{ messageId: "invalidKey" }],
    },
  ],
});
