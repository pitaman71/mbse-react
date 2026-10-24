# mbse-react

A React UI for any mbse-schemas app: an index site driven exclusively by the schema, so that any MBSE app's data can be
browsed and inspected with no app-specific UI code.

The schema, object and relation browsers and the object inspector (VISUALIZATION.md, FEA-004 and FEA-005), reading
logical views through mbse-rest's TypeScript client (`@mbse/rest`).

It depends on [mbse-schemas](https://github.com/pitaman71/mbse-schemas)' TypeScript implementation as a checkout beside
this repository, pinned in [siblings.json](siblings.json).

```sh
cd typescript5 && npm install && npm run typecheck
```
