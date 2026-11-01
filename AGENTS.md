# Guide for AI agents

The schema, object and relation browsers and the object inspector (mbse-basis [FEA-004: index site browser views](../mbse-basis/docs/features/FEA-004.md) and [FEA-005: inspector views](../mbse-basis/docs/features/FEA-005.md)), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Invariants

The conventions every mbse repository shares are stated once in mbse-basis; this file cites them and keeps
only what differs here.

- **Vocabulary**: [VOC-007: property](../mbse-basis/docs/VOCABULARY.md#VOC-007) and [VOC-026: schema](../mbse-basis/docs/VOCABULARY.md#VOC-026), each qualified with whose it is where
  it meets a language's own term ([the vocabulary](../mbse-basis/docs/VOCABULARY.md), its introduction).
- **Models and packages**: [PRI-019: fluent builder syntax](../mbse-basis/docs/PRINCIPLES.md#PRI-019) and [PRI-030: one package layout](../mbse-basis/docs/PRINCIPLES.md#PRI-030).
- **Documents**: navigation lines, the README opening with why, and what this file holds ([Rules for every document](../mbse-basis/docs/README.md#rules-for-every-document)).
- **Work**: [PRI-029: parallel work in polyrepo workspaces](../mbse-basis/docs/PRINCIPLES.md#PRI-029), [PRI-031: the version is the contract](../mbse-basis/docs/PRINCIPLES.md#PRI-031), [PRI-032: a sibling's gap is reported, not worked around](../mbse-basis/docs/PRINCIPLES.md#PRI-032) and [PRI-033: work lands by branch and pull request](../mbse-basis/docs/PRINCIPLES.md#PRI-033).
- **What this repository builds is specified in mbse-basis' features and capabilities**, cited by ID ([Detail files](../mbse-basis/docs/README.md#detail-files)).
- **It reads logical views through mbse-rest's client** (`@mbse/rest/Services/Rest/Client`: `Client`, `Views`): [FEA-003: no-code logical views](../mbse-basis/docs/features/FEA-003.md)
  and its capabilities, as built. Develop against mbse-rest's golden corpus before a server runs
  ([README.md, Against the golden corpus](README.md#against-the-golden-corpus-the-default)).
- Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.

## Commands

```sh
python3 ../mbse-basis/scripts/polyrepo.py pin   # the siblings beside this repository, pinned in siblings.json
cd typescript5 && npm install && npm run typecheck && npm test   # Vitest with Testing Library in jsdom, against the golden corpus
```
