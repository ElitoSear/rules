import rule from "../../src/rules/no-abbreviations-in-arrow-functions.ts";
import { ruleTester } from "../rule-tester.ts";

ruleTester.run("no-abbreviations-in-arrow-functions", rule, {
  valid: [
    "users.map((user) => user.name);",
    "items.filter((item) => item.active);",
    "ids.map((id) => id);",
    "previousWorkflowClients.map((previousWorkflowClient) => previousWorkflowClient.id);",
    // Unrelated short names are left to other rules
    "users.map((x) => x.name);",
    "items.reduce((accumulator, item) => accumulator + item, 0);",
    // Later parameters are not the element
    "items.forEach((item, i) => use(item, i));",
    "users.map(({ name }) => name);",
    "getUsers().map((u) => u.name);",
    "map((u) => u);",
    "users.map(function (u) { return u; });",
    // Callee, not argument
    "users.then(((u) => u)());",
  ],
  invalid: [
    {
      code: "cases.map((c) => c.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "c", expected: "case" },
        },
      ],
    },
    {
      code: "caches.map((c) => c.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "c", expected: "cache" },
        },
      ],
    },
    {
      code: "responses.map((r) => r.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "r", expected: "response" },
        },
      ],
    },
    {
      code: "databases.map((d) => d.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "d", expected: "database" },
        },
      ],
    },
    {
      code: "people.map((p) => p.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "p", expected: "person" },
        },
      ],
    },
    {
      code: "children.map((c) => c.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "c", expected: "child" },
        },
      ],
    },
    {
      code: "indices.map((i) => i.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "i", expected: "index" },
        },
      ],
    },
    {
      code: "analyses.map((a) => a.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "a", expected: "analysis" },
        },
      ],
    },
    {
      code: "data.map((d) => d.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "d", expected: "data" },
        },
      ],
    },
    {
      code: "users.map((u) => u.name);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "u", expected: "user" },
        },
      ],
    },
    {
      code: "arrayOfItems.forEach((aoi) => { aoi.doSomething(); });",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "aoi", expected: "arrayOfItem" },
        },
      ],
    },
    {
      code: "previousWorkflowClients.map((pwc) => pwc.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "pwc", expected: "previousWorkflowClient" },
        },
      ],
    },
    {
      code: "items.filter((i) => i.active);",
      errors: [{ messageId: "abbreviatedParameter" }],
    },
    {
      code: "categories.map((c) => c.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "c", expected: "category" },
        },
      ],
    },
    {
      code: "boxes.map((b) => b.size);",
      errors: [
        { messageId: "abbreviatedParameter", data: { name: "b", expected: "box" } },
      ],
    },
    {
      code: "this.workflowRuns.map((wr) => wr.id);",
      errors: [{ messageId: "abbreviatedParameter" }],
    },
    {
      code: "state.users?.map((u) => u.id);",
      errors: [{ messageId: "abbreviatedParameter" }],
    },
    {
      code: "users!.map((u: User) => u.id);",
      errors: [{ messageId: "abbreviatedParameter" }],
    },
    {
      code: "user_accounts.map((ua) => ua.id);",
      errors: [
        {
          messageId: "abbreviatedParameter",
          data: { name: "ua", expected: "userAccount" },
        },
      ],
    },
    {
      code: "users.map((u = fallback) => u.id);",
      errors: [{ messageId: "abbreviatedParameter" }],
    },
  ],
});
