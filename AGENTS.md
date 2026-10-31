# Guide for AI agents

The schema, object and relation browsers and the object inspector (mbse-basis [FEA-004: index site browser views](../mbse-basis/docs/features/FEA-004.md) and [FEA-005: inspector views](../mbse-basis/docs/features/FEA-005.md)), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Invariants

The conventions every mbse repository shares are stated once in mbse-basis; this file cites them and keeps
only what differs here.

- **Vocabulary**: [VOC-007: property](../mbse-basis/docs/VOCABULARY.md#VOC-007) and [VOC-026: schema](../mbse-basis/docs/VOCABULARY.md#VOC-026) for schema-governed things, qualified with whose it is where
  it meets a language's own term ([the vocabulary](../mbse-basis/docs/VOCABULARY.md), its introduction).
- **Models as data** are written in the builders' fluent syntax ([PRI-019: fluent builder syntax](../mbse-basis/docs/PRINCIPLES.md#PRI-019)); packages are laid out and
  capitalized alike ([PRI-030: one package layout](../mbse-basis/docs/PRINCIPLES.md#PRI-030)).
- **Documents**: navigation lines, the README opening with why, and what this file holds ([Rules for every document](../mbse-basis/docs/README.md#rules-for-every-document)).
- **Work**: [PRI-029: parallel work in polyrepo workspaces](../mbse-basis/docs/PRINCIPLES.md#PRI-029), so a sibling is changed only through a workspace that edits it, never from this
  checkout; [PRI-031: the version is the contract](../mbse-basis/docs/PRINCIPLES.md#PRI-031); [PRI-032: a sibling's gap is reported, not worked around](../mbse-basis/docs/PRINCIPLES.md#PRI-032) (mbse-schemas used as it stands); and [PRI-033: work lands by branch and pull request](../mbse-basis/docs/PRINCIPLES.md#PRI-033).
- **What this repository builds is specified in mbse-basis' features and capabilities**, cited by ID; where one is
  silent, decide and record it as the basis says ([Detail files](../mbse-basis/docs/README.md#detail-files)).
- **Siblings are checkouts beside this repository**, pinned by version and commit in `siblings.json`
  (`python3 ../mbse-basis/scripts/polyrepo.py pin`).
- **Type-check and test** from `typescript5/`: `npm install && npm run typecheck && npm test` (Vitest, one-shot,
  against the golden corpus): Vitest with Testing Library in jsdom, against the corpus through the same fetch the app
  uses.
- **It reads logical views through mbse-rest's client** (`@mbse/rest/Services/Rest/Client`: `Client`, `Views`), whose
  calls, templates and view kinds are [FEA-003: no-code logical views](../mbse-basis/docs/features/FEA-003.md)'s and its capabilities', as built. Develop against mbse-rest's golden corpus
  ([`mbse-rest/conformance/`](../mbse-rest/conformance)) before a server runs, serving it through a fetch of your own as mbse-rest's
  `typescript5/tests/client.test.ts` does. mbse-rest is a sibling checkout, pinned in `siblings.json`.
- Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.
