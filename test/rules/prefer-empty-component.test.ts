import rule from "../../src/rules/prefer-empty-component.ts";
import { ruleTester } from "../rule-tester.ts";

const unconfirmed = [{ messageId: "useEmptyOrDisable" as const }];
const confirmed = [{ messageId: "useEmpty" as const }];

ruleTester.run("prefer-empty-component", rule, {
  valid: [
    "items.length === 0 && <Empty />;",
    "items.length === 0 ? <div><EmptyTitle /></div> : <List />;",
    "items.length === 0 && <FieldError />;",
    "items.length === 0 && <SelectItem value='none' />;",
    "items.length > 0 && <List />;",
    "items.length === 2 && <Pair />;",
    "items.length === 0 && 'none';",
    "items.length > 0 ? <List /> : null;",
    "function C() { if (items.length === 0) { return <P />; } else { return <L />; } }",
    "function C() { if (items.length > 0) { return <L />; } }",
    { code: "items.length === 0 && <Notice />;", options: [{ ignoreComponents: ["Notice"] }] },
  ],
  invalid: [
    {
      code: "items.length === 0 && <p>None</p>;",
      options: [{ importBase: "~/ui" }],
      errors: [{ messageId: "useEmptyOrDisable", data: { importBase: "~/ui" } }],
    },
    { code: "items.length === 0 && <p>None</p>;", errors: unconfirmed },
    { code: "items.length == 0 && <p />;", errors: unconfirmed },
    { code: "items.length <= 0 && <p />;", errors: unconfirmed },
    { code: "items.length < 1 && <p />;", errors: unconfirmed },
    { code: "0 === items.length && <p />;", errors: unconfirmed },
    { code: "1 > items.length && <p />;", errors: unconfirmed },
    { code: "!items.length && <p />;", errors: unconfirmed },
    { code: "items?.length === 0 && <p />;", errors: unconfirmed },
    { code: "!items?.length && <></>;", errors: unconfirmed },
    { code: "items.length === 0 ? <p /> : <List />;", errors: unconfirmed },
    { code: "items.length > 0 ? <List /> : <p />;", errors: unconfirmed },
    { code: "items.length !== 0 ? <List /> : <p />;", errors: unconfirmed },
    { code: "items.length != 0 ? <List /> : <p />;", errors: unconfirmed },
    { code: "items.length >= 1 ? <List /> : <p />;", errors: unconfirmed },
    { code: "0 < items.length ? <List /> : <p />;", errors: unconfirmed },
    { code: "items.length ? <List /> : <p />;", errors: unconfirmed },
    { code: "!!items.length ? <List /> : <p />;", errors: unconfirmed },
    {
      code: "function C() { if (items.length === 0) { return <p />; } return <List />; }",
      errors: unconfirmed,
    },
    { code: "function C() { if (!items.length) return <p />; return <List />; }", errors: unconfirmed },
    {
      code: "function C() { if (items.length > 0) { return <List />; } else { return <p />; } }",
      errors: unconfirmed,
    },
    { code: "items.length === 0 && <p>{t('list.no_items')}</p>;", errors: confirmed },
    { code: "items.length === 0 && <p>{translate('ns', 'list_empty')}</p>;", errors: confirmed },
    { code: "items.length === 0 && <p>{t('list.title')}</p>;", errors: unconfirmed },
  ],
});
