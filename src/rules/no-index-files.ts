import path from "node:path";
import { createRule } from "../create-rule.ts";

export default createRule({
  name: "no-index-files",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow files named `index`; use descriptive file names and direct imports.",
    },
    schema: [],
    messages: {
      noIndexFiles:
        "Files named 'index' are not allowed. Use a descriptive name and import directly.",
    },
  },
  defaultOptions: [],
  create(context) {
    // index.ts, index.d.ts, index.test.tsx, Index.js. The win32 flavour splits on both
    // separators, so Windows paths are read the same on every platform.
    const isIndexFile = /^index\./i.test(path.win32.basename(context.filename));
    if (!isIndexFile) return {};
    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          messageId: "noIndexFiles",
        });
      },
    };
  },
});
