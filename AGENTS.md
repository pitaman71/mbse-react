# Guide for AI agents

The schema, object and relation browsers and the object inspector (mbse-basis [FEA-004: index site browser views](../mbse-basis/docs/features/FEA-004.md) and [FEA-005: inspector views](../mbse-basis/docs/features/FEA-005.md)), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Read before any work

Agents must read these mbse-basis documents before doing any work:

- [The mbse basis](../mbse-basis/docs/README.md)
- [Principles](../mbse-basis/docs/PRINCIPLES.md)
- [Features](../mbse-basis/docs/features/README.md)
- [Capabilities](../mbse-basis/docs/capabilities/README.md)

These may be read selectively, on demand: [Vocabulary](../mbse-basis/docs/VOCABULARY.md) and
[Qualities](../mbse-basis/docs/QUALITIES.md).

Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.

## This repository

- It reads logical views only through mbse-rest's client module, `@mbse/rest/Services/Rest/Client` (`Client`,
  `Views`).

## Commands

```sh
python3 ../mbse-basis/scripts/polyrepo.py pin   # the siblings beside this repository, pinned in siblings.json
cd typescript5 && npm install && npm run typecheck && npm test   # Vitest with Testing Library in jsdom, against the golden corpus
```
