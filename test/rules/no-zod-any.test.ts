import rule from "../../src/rules/no-zod-any.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-zod-any", rule, {
  valid: [
    'import { z } from "zod"; z.string();',
    'import { z } from "zod"; type Schema = z.ZodString;',
    // Not bound to zod
    "z.any();",
    'import { z } from "other"; z.any();',
    "const zod = { any: () => 1 }; zod.any();",
    'import { z } from "zod"; values.any();',
    'import { string } from "zod"; string();',
  ],
  invalid: [
    {
      code: 'import { z } from "zod"; z.any();',
      errors: [{ messageId: "noZodAny", data: { name: "any" } }],
    },
    {
      code: 'import * as zod from "zod"; zod.any();',
      errors: [{ messageId: "noZodAny" }],
    },
    {
      code: 'import zod from "zod"; const schema = zod.any();',
      errors: [{ messageId: "noZodAny" }],
    },
    {
      code: 'import { z as schema } from "zod/v4"; schema.any();',
      errors: [{ messageId: "noZodAny" }],
    },
    {
      code: 'import { z } from "zod"; z["any"]();',
      errors: [{ messageId: "noZodAny" }],
    },
    {
      code: 'import { z } from "zod"; z?.any();',
      errors: [{ messageId: "noZodAny" }],
    },
    {
      code: 'import { z } from "zod"; type Loose = z.ZodTypeAny;',
      errors: [{ messageId: "noZodAny", data: { name: "ZodTypeAny" } }],
    },
    {
      code: 'import type { z } from "zod"; let schema: z.ZodAny;',
      errors: [{ messageId: "noZodAny", data: { name: "ZodAny" } }],
    },
    {
      code: 'import * as zod from "zod"; function parse(schema: zod.ZodTypeAny) {}',
      errors: [{ messageId: "noZodAny" }],
    },
    {
      code: 'import { any, type ZodTypeAny as Loose } from "zod";',
      errors: [
        { messageId: "noZodAny", data: { name: "any" } },
        { messageId: "noZodAny", data: { name: "ZodTypeAny" } },
      ],
    },
  ],
});
