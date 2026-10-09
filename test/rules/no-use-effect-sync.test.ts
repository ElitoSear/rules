import rule from "../../src/rules/no-use-effect-sync.ts";
import { ruleTester } from "../rule-tester.ts";

const error = [{ messageId: "noUseEffect" as const }];

ruleTester.run("no-use-effect-sync", rule, {
  valid: [
    "useLayoutEffect(() => {}, []);",
    "const fullName = first + ' ' + last;",
    "useMemo(() => compute(items), [items]);",
    "import { useEffect as runEffect } from 'other'; runEffect();",
    "React[hookName](() => {});",
  ],
  invalid: [
    { code: "useEffect(() => { setName(first); }, [first]);", errors: error },
    { code: "useEffect(() => {}, []);", errors: error },
    { code: "React.useEffect(() => {});", errors: error },
    { code: "React['useEffect'](() => {});", errors: error },
    { code: "import * as Core from 'react'; Core.useEffect(() => {});", errors: error },
    {
      code: "import { useEffect as runEffect } from 'react'; runEffect(() => {}, []);",
      errors: error,
    },
  ],
});
