# Guide for AI agents

The schema, object and relation browsers and the object inspector (mbse-basis [FEA-004: index site browser views](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-004.md) and [FEA-005: inspector views](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/FEA-005.md)), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Read before any work

Agents must read these mbse-basis documents before doing any work:

- [The mbse basis](https://github.com/pitaman71/mbse-basis/blob/main/docs/README.md)
- [Principles](https://github.com/pitaman71/mbse-basis/blob/main/docs/PRINCIPLES.md)
- [Features](https://github.com/pitaman71/mbse-basis/blob/main/docs/features/README.md)
- [Capabilities](https://github.com/pitaman71/mbse-basis/blob/main/docs/capabilities/README.md)

These may be read selectively, on demand: [Vocabulary](https://github.com/pitaman71/mbse-basis/blob/main/docs/VOCABULARY.md) and
[Qualities](https://github.com/pitaman71/mbse-basis/blob/main/docs/QUALITIES.md).

Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.

Resolve a link written `mbse:<repo>/<path>`, as skills and source comments write a link into another mbse
repository, to the first of these that exists: in a polyrepo checkout, `<repo root>/../<repo>/<path>`, where `<repo
root>` is this repository's root; for a link into the installed package's own repository, `<path>` without its
language directory (`python3/` or `typescript5/`), under the installed package's root (Python: the `site-packages`
directory that holds `mbse/`; npm: the package's directory), where the package ships that file; otherwise
`https://github.com/pitaman71/<repo>/blob/main/<path>`.

## This repository

- It reads logical views only through mbse-rest's client module, `@mbse/rest/Services/Rest/Client` (`Client`,
  `Views`).

## Commands

```sh
python3 ../mbse-basis/scripts/polyrepo.py pin   # the siblings beside this repository, pinned in siblings.json
cd typescript5 && npm install && npm run typecheck && npm test   # Vitest with Testing Library in jsdom, against the golden corpus
```
