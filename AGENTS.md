# Guide for AI agents

The schema, object and relation browsers and the object inspector (VISUALIZATION.md, FEA-004 and FEA-005), reading logical views through mbse-rest's client (`@mbse/rest`). React, TypeScript and CSS-in-TS, in `typescript5/` (`@mbse/react`).

## Invariants

- **Use mbse-schemas as it stands.** A gap found is reported to the user, not worked around here.
- **Siblings are checkouts beside this repository**, pinned by commit in `siblings.json`. Other agents may be working
  in them: never edit a sibling from here.
- **What this repository builds is specified in the workspace's `VISUALIZATION.md`**, by feature and capability ID;
  cite those IDs rather than restate them.
- **Type-check and test** from `typescript5/`: `npm install && npm run typecheck && npm test` (Vitest, one-shot,
  against the golden corpus). Decisions taken where VISUALIZATION.md is silent are in `docs/DESIGN.md`.
- **It reads logical views through mbse-rest's client** (`@mbse/rest/Services/Rest/Client`: `Client`, `Views`), whose
  calls, templates and view kinds are mbse-rest's `docs/CONTRACT.md`. Develop against mbse-rest's golden corpus
  (`../mbse-rest/conformance/`) before a server runs, serving it through a fetch of your own as mbse-rest's
  `typescript5/tests/client.test.ts` does. mbse-rest is a sibling checkout, pinned in `siblings.json` (edited by hand
  until `polyrepo.py pin` supports a TypeScript-only repository).

## Working agreement (M0, for every agent on mbse-rest, mbse-dynamodb, mbse-react and mbse-demo-apps)

- Work on a branch in each repository you change (M0's is `m0-contract`). Commit and push after every step whose
  tests pass (`git push -u origin <branch>`, or `python3 ../mbse-basis/scripts/polyrepo.py push` where it supports
  every sibling). Never commit to `main`. When done, open one pull request per repository with `gh pr create`,
  listing the decisions for review.
- Where VISUALIZATION.md is silent, take the simplest default consistent with it and with mbse-schemas, record it
  under "Decided by the agent, for review" (for the REST contract, in mbse-rest's `docs/CONTRACT.md`, from mbse-rest's
  own work; otherwise in this repository's docs), and keep going.
- Stop and report (do not work around) for: a gap or bug in mbse-schemas; an outward-facing action beyond pushing
  branches and opening pull requests in these repositories; anything destructive (force-push, deleting branches or
  files outside your work, rewriting history); a contradiction in VISUALIZATION.md that changes what gets built.
- Never edit a sibling from another repository's work; never edit mbse-schemas, mbse-basis or VISUALIZATION.md.
- Never write to `~/.claude/projects/*/memory/` or any hidden memory: what is worth keeping goes in the repository.
- Conventions: Python with uv (`uv sync`, `uv run pytest`), never pip; package capitalization as mbse-schemas has it
  (`mbse.Services.Rest`); "property", never "field", and "schema", never "type", for schema-governed things. Models
  as data are written in the builders' fluent syntax, never wire format, never helpers that wrap builder syntax.
- End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, and every pull request's
  description with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
