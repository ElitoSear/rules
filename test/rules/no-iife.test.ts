import rule from "../../src/rules/no-iife.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-iife", rule, {
  valid: [
    "const run = () => 1; run();",
    "items.map((item) => item.id);",
    "setTimeout(() => {}, 0);",
    "const handler = function () {}; handler.call(this);",
    { code: "(async () => { await x; })();", options: [{ allowAsync: true }] },
    { code: "(async function () {})();", options: [{ allowAsync: true }] },
    { code: "(async () => {}).call(this);", options: [{ allowAsync: true }] },
    { code: "((async () => 1) as () => Promise<number>)();", options: [{ allowAsync: true }] },
  ],
  invalid: [
    { code: "(function () {})();", errors: [{ messageId: "noIife" }] },
    { code: "(() => {})();", errors: [{ messageId: "noIife" }] },
    { code: "(async () => { await x; })();", errors: [{ messageId: "noIife" }] },
    { code: "(function () {}).call(this);", errors: [{ messageId: "noIife" }] },
    { code: "(() => {}).apply(null, []);", errors: [{ messageId: "noIife" }] },
    { code: "(function () {})['call'](this);", errors: [{ messageId: "noIife" }] },
    { code: "((() => 1) as () => number)();", errors: [{ messageId: "noIife" }] },
    { code: "(() => {})();", options: [{ allowAsync: true }], errors: [{ messageId: "noIife" }] },
    { code: "(function () {}).apply(null, []);", options: [{ allowAsync: true }], errors: [{ messageId: "noIife" }] },
    { code: "(async () => {})();", options: [{ allowAsync: false }], errors: [{ messageId: "noIife" }] },
  ],
});
