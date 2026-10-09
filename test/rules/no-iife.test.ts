import rule from "../../src/rules/no-iife.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-iife", rule, {
  valid: [
    "const run = () => 1; run();",
    "items.map((item) => item.id);",
    "setTimeout(() => {}, 0);",
    "const handler = function () {}; handler.call(this);",
  ],
  invalid: [
    { code: "(function () {})();", errors: [{ messageId: "noIife" }] },
    { code: "(() => {})();", errors: [{ messageId: "noIife" }] },
    { code: "(async () => { await x; })();", errors: [{ messageId: "noIife" }] },
    { code: "(function () {}).call(this);", errors: [{ messageId: "noIife" }] },
    { code: "(() => {}).apply(null, []);", errors: [{ messageId: "noIife" }] },
    { code: "(function () {})['call'](this);", errors: [{ messageId: "noIife" }] },
    { code: "((() => 1) as () => number)();", errors: [{ messageId: "noIife" }] },
  ],
});
