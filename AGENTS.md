# Guide for AI agents

The schema, object and relation browsers and the object inspector (VISUALIZATION.md, FEA-004 and FEA-005), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Invariants

- **Use mbse-schemas as it stands.** A gap found is reported to the user, not worked around here.
- **Siblings are checkouts beside this repository**, pinned by commit in `siblings.json`. Other agents may be working
  in them: never edit a sibling from here.
- **What this repository builds is specified in the workspace's `VISUALIZATION.md`**, by feature and capability ID;
  cite those IDs rather than restate them.
- **Type-check** from `typescript5/`: `npm install && npm run typecheck`.
