# @elitosear/eslint-rules

[![CI](https://github.com/ElitoSear/rules/actions/workflows/ci.yml/badge.svg)](https://github.com/ElitoSear/rules/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@elitosear/eslint-rules)](https://www.npmjs.com/package/@elitosear/eslint-rules)
[![license](https://img.shields.io/npm/l/@elitosear/eslint-rules)](LICENSE)

Opinionated ESLint rules for React, TypeScript, Zod, TanStack Query and i18n codebases. Flat config only (ESLint 9+). Written in TypeScript on `@typescript-eslint/utils`, with tests for every rule.

No rule is enabled by default. Pick the ones that match your standards.

## Install

```sh
pnpm add -D @elitosear/eslint-rules eslint
```

Requires Node 22+ and ESLint 9 or newer.

## Use

```js
// eslint.config.js
import elitosear from "@elitosear/eslint-rules";
import tseslint from "typescript-eslint";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { elitosear },
    rules: {
      "elitosear/no-index-files": "error",
      "elitosear/no-export-reexport": "error",
      "elitosear/no-iife": "error",
      "elitosear/no-native-html-elements": ["warn", { importBase: "@/components/ui" }],
    },
  },
];
```

The namespace (`elitosear` above) is your choice. The `.tsx` rules need a parser with JSX enabled, which `typescript-eslint` provides.

## Rules

| Rule | Description |
| --- | --- |
| [`enforce-combobox-items`](#enforce-combobox-items) | `Combobox` needs an `items` prop and a render-function `ComboboxList` for native search filtering. |
| [`enforce-i18n-snake-case-keys`](#enforce-i18n-snake-case-keys) | Translation keys are snake_case. |
| [`enforce-locale-nesting`](#enforce-locale-nesting) | Sibling locale keys sharing a prefix are nested instead. |
| [`no-abbreviations-in-arrow-functions`](#no-abbreviations-in-arrow-functions) | Callback parameters are not abbreviations of the collection name. |
| [`no-excessive-nested-ternary`](#no-excessive-nested-ternary) | At most one level of nested ternary. |
| [`no-export-reexport`](#no-export-reexport) | No re-exporting imported symbols. |
| [`no-iife`](#no-iife) | No immediately invoked function expressions. |
| [`no-index-files`](#no-index-files) | No files named `index`. |
| [`no-native-html-elements`](#no-native-html-elements) | Use design-system components instead of native HTML elements. |
| [`no-use-effect-sync`](#no-use-effect-sync) | No `useEffect`. |
| [`no-zod-any`](#no-zod-any) | No `z.any()` or `ZodTypeAny`. |
| [`prefer-empty-component`](#prefer-empty-component) | Use an `<Empty>` component for empty-list placeholders. |
| [`prefer-react-hook-form`](#prefer-react-hook-form) | Form state lives in react-hook-form, not `useState`. |
| [`prefer-tanstack-query`](#prefer-tanstack-query) | Fetch in TanStack Query, not in `useEffect`. |
| [`rename-unused-underscore`](#rename-unused-underscore) | Name unused bindings `_unused`, not `_`. |

### enforce-combobox-items

Searchable comboboxes only filter natively when `Combobox` receives `items` and `ComboboxList` renders them with a function.

```tsx
// bad
<Combobox><ComboboxList><ComboboxItem value="a" /></ComboboxList></Combobox>
// good
<Combobox items={items}><ComboboxList>{(item) => <ComboboxItem value={item} />}</ComboboxList></Combobox>
```

A `{...spread}` is trusted to supply the prop.

### enforce-i18n-snake-case-keys

Keys passed to `t()`, `i18n.t()`, `useTranslation` and `next-intl` helpers must be snake_case, including constants, ternary branches and template-literal fragments.

```ts
t("saveButton");   // bad
t("save_button");  // good
```

Option `localesPath` (a folder of locale JSON files, relative to the lint cwd) enables an autofix that applies only when the snake_case key already exists in every locale file. The rule never writes locale files.

### enforce-locale-nesting

In locale objects and JSON files, sibling keys that share a snake_case prefix should be nested under it.

```json
{ "task_title": "Title", "task_body": "Body" }
```

becomes

```json
{ "task": { "title": "Title", "body": "Body" } }
```

Options: `ignore` (dot paths of groups to skip) and `ignoreSubtrees` (dot paths whose whole subtree is skipped). Linting JSON requires `jsonc-eslint-parser`. The fix is skipped when comments sit inside the group.

### no-abbreviations-in-arrow-functions

The element parameter of a collection callback must not be the initials of the collection's singular name.

```ts
users.map((u) => u.id);     // bad
users.map((user) => user.id); // good
```

### no-excessive-nested-ternary

Reports a ternary nested inside another ternary, including through `as`, `!` and `satisfies`. Prefer early returns, a lookup table or a function.

| Option | Default | Meaning |
| --- | --- | --- |
| `maxDepth` | `1` | Maximum depth of a ternary chain; `1` means a single ternary with no nesting. |

```js
"elitosear/no-excessive-nested-ternary": ["error", { maxDepth: 2 }]
```

### no-export-reexport

Reports re-exporting an imported symbol, including `export * from`, `export { x } from` and `import { x } …; export { x }`. Export what the file defines and import from the defining module.

### no-iife

Reports `(function () {})()`, `(() => {})()`, `.call`/`.apply` forms and TypeScript-wrapped variants.

| Option | Default | Meaning |
| --- | --- | --- |
| `allowAsync` | `false` | Allow immediately invoked async functions and arrows; synchronous IIFEs are still reported. |

```js
"elitosear/no-iife": ["error", { allowAsync: true }]
```

### no-index-files

Reports a file named `index.*` (case-insensitive, including `index.d.ts` and `index.test.tsx`). Use descriptive names and import them directly. Nothing in the repo may be the index of a folder.

### no-native-html-elements

Reports native elements that have a design-system equivalent (`button`, `input`, `select`, `table` family, `textarea`, `hr`, and so on), `<input type="checkbox">` and `type="radio"`, and a `div` wrapping a `Label` and a form control.

| Option | Default | Meaning |
| --- | --- | --- |
| `importBase` | `"@/components/ui"` | Module path components are imported from (shadcn's alias). |
| `components` | `{}` | Extra or overriding `tag → { component, importPath }` entries. |
| `ignore` | `[]` | Tags always allowed. |

### no-use-effect-sync

Reports `useEffect` (also aliased, `React.useEffect` and `React["useEffect"]`). Derive values during render, use `useMemo`, a `key` reset, TanStack Query or `useSyncExternalStore`. For the rare real case, disable the line with a description.

| Option | Default | Meaning |
| --- | --- | --- |
| `allowEmptyDependencies` | `false` | Allow `useEffect(callback, [])` with a literal empty array; other dependency arrays and missing ones are still reported. |

```js
"elitosear/no-use-effect-sync": ["error", { allowEmptyDependencies: true }]
```

### no-zod-any

Reports `z.any()`, `ZodAny` and `ZodTypeAny` when the name is imported from `zod` (named, aliased, namespace or default). Use a specific schema.

### prefer-empty-component

Reports empty-array placeholders (`items.length === 0 && …`, `!items.length`, `items.length ? <List/> : <p/>`) so they render an `<Empty>` component.

| Option | Default | Meaning |
| --- | --- | --- |
| `importBase` | `"@/components/ui"` | Module path components are imported from. |
| `ignoreComponents` | `["Empty", "FieldError", "SelectItem"]` | Component-name prefixes that mark the placeholder as already handled. |

### prefer-react-hook-form

Reports `useState` that holds the value of an input (`value`, `checked`, `selected`, including `form.field` and `?? ""` forms).

### prefer-tanstack-query

Reports an asynchronous `useEffect` that makes a request (`fetch`, `axios`, `ky`, `supabase`, or `.get/.post/.put/.patch/.delete/.from/.rpc`).

Each option replaces its default list. To extend a default, list the full set.

| Option | Default | Meaning |
| --- | --- | --- |
| `requestFunctions` | `["fetch", "axios", "ky"]` | Names called directly that make a request. |
| `requestClients` | `["axios", "supabase", "ky"]` | Objects whose method calls make a request. |
| `requestMethods` | `["get", "post", "put", "patch", "delete", "from", "rpc"]` | Method names that make a request on any object. |

```js
"elitosear/prefer-tanstack-query": ["warn", { requestClients: ["axios", "supabase", "ky", "http"] }]
```

### rename-unused-underscore

Reports unused parameters, variables and catch bindings named `_`, and renames them to `_unused` (keeping type annotations). It does not touch `_.map`, `obj._` or `{ _: 1 }`.

## Development

```sh
pnpm install
pnpm type-check
pnpm test
pnpm build
```

Rules live in `src/rules/<rule-name>.ts` with tests in `test/rules/<rule-name>.test.ts`, and are registered in `src/plugin.ts`. The plugin test fails when a rule is unregistered, undescribed or untested.

## Release

CI verifies every push and pull request. To publish, bump the version and push the tag:

```sh
npm version minor
git push --follow-tags
```

The `Release` workflow re-runs the checks, verifies that the tag matches `package.json` and publishes to npm with provenance through npm trusted publishing (OIDC), so no token is stored. The trusted publisher is configured once on npmjs.com for this repository and `release.yml`.

## License

[MIT](LICENSE)
