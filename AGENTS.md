# Guide for AI agents

The schema, object and relation browsers and the object inspector (mbse-basis [FEA-004: index site browser views](../mbse-basis/docs/features/FEA-004.md) and [FEA-005: inspector views](../mbse-basis/docs/features/FEA-005.md)), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Invariants

- **Use mbse-schemas as it stands.** A gap found is reported to the user, not worked around here.
- **Siblings are checkouts beside this repository**, pinned by commit in `siblings.json`. Other agents may be working
  in them: never edit a sibling from here.
- **What this repository builds is specified in mbse-basis' features and capabilities**
  ([`mbse-basis/docs/features/`](../mbse-basis/docs/features), [`mbse-basis/docs/capabilities/`](../mbse-basis/docs/capabilities)), by ID; cite those IDs, each introduced
  by bridge language (mbse-basis [`docs/README.md`](../mbse-basis/docs/README.md), Rules for writing items, "Bridge, don't duplicate").
- **Type-check and test** from `typescript5/`: `npm install && npm run typecheck && npm test` (Vitest, one-shot,
  against the golden corpus): Vitest with Testing Library in jsdom, against the corpus through the same fetch the app
  uses. Decisions taken where the capabilities are silent are in their detail files in mbse-basis (Decided by an agent,
  for review), each labeled mbse-react.
- **It reads logical views through mbse-rest's client** (`@mbse/rest/Services/Rest/Client`: `Client`, `Views`), whose
  calls, templates and view kinds are [FEA-003: no-code logical views](../mbse-basis/docs/features/FEA-003.md)'s and its capabilities', as built. Develop against mbse-rest's golden corpus
  ([`mbse-rest/conformance/`](../mbse-rest/conformance)) before a server runs, serving it through a fetch of your own as mbse-rest's
  `typescript5/tests/client.test.ts` does. mbse-rest is a sibling checkout, pinned in `siblings.json` (edited by hand
  until `polyrepo.py pin` supports a TypeScript-only repository).

## Working agreement (M0, for every agent on mbse-rest, mbse-dynamodb, mbse-react and mbse-demo-apps)

- Work on a branch in each repository you change (M0's is `m0-contract`). Commit and push after every step whose
  tests pass (`git push -u origin <branch>`, or `python3 ../mbse-basis/scripts/polyrepo.py push` where it supports
  every sibling). Never commit to `main`. When done, open one pull request per repository with `gh pr create`,
  listing the decisions for review.
- Where the capabilities are silent, take the simplest default consistent with them and with mbse-schemas, record it
  in the detail file of the capability it serves, in mbse-basis' [`docs/capabilities/`](../mbse-basis/docs/capabilities), under "Decided by
  an agent, for review", labeled with this repository's name and the next number, and keep going.
- Stop and report (do not work around) for: a gap or bug in mbse-schemas; an outward-facing action beyond pushing
  branches and opening pull requests in these repositories; anything destructive (force-push, deleting branches or
  files outside your work, rewriting history); a contradiction in a capability that changes what gets built.
- Never edit a sibling from another repository's work; never edit mbse-schemas; in mbse-basis,
  edit only a capability's or feature's As built, Blocked and Decided sections, in a pull request beside this
  repository's.
- Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.
- Conventions: Python with uv (`uv sync`, `uv run pytest`), never pip; package capitalization as mbse-schemas has it
  (`mbse.Services.Rest`); "property", never "field", and "schema", never "type", for schema-governed things. Models
  as data are written in the builders' fluent syntax, never wire format, never helpers that wrap builder syntax.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and every pull request's
  description with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
