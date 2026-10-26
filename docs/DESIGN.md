# mbse-react's design (M3)

The index site of VISUALIZATION.md's FEA-001 (CAP-001): the schema, object and relation browsers (FEA-004: CAP-009,
CAP-010, CAP-011) and the object inspector (FEA-005), reading the logical views of CAP-005 to CAP-008 through
mbse-rest's client (`@mbse/rest`) as mbse-rest's `docs/CONTRACT.md` fixes them. This page cites those IDs rather than
restating them.

## Where things are (`typescript5/src/`)

| Module | What it does |
|---|---|
| `data/corpus.ts` | A fetch that serves mbse-rest's golden corpus (`../mbse-rest/conformance/`), as mbse-rest's client tests do; a request it holds no case for is answered 599 with an error body |
| `data/schemas.ts` | What the UI reads from the schemas (CAP-002): which schemas each browser shows, each object schema's named adjacencies and the schemas their entries link |
| `data/views.ts` | `Service`: the client and a store holding the app's schemas; each view requested with `Views.request` and shaped from frames with the client's readers (`Views.label`, `summary`, `chip`, `entryLabel`, `entryProperties`) |
| `ui/Browsers.tsx` | CAP-009, CAP-010, CAP-011 |
| `ui/Inspector.tsx` | FEA-005, with CAP-007's detail and CAP-008's adjacency lists |
| `ui/navigation.tsx` | The current view and inspected object, kept in the address bar |
| `ui/styles.ts` | Every style, in TypeScript (Emotion), and the responsive layout |
| `config.ts` | The source: the corpus (default) or a live server (`MBSE_REST_URL`) |

## Decided by the agent, for review

Where VISUALIZATION.md and CONTRACT.md are silent, the simplest default consistent with them:

1. **CSS-in-TS: Emotion (`@emotion/css`).** Its `css` takes typed style objects and returns a class name, so it needs
   no Babel plugin, no JSX pragma and no build step of its own: the same code runs under Vite, Vitest's jsdom and a
   production build. Zero-runtime libraries (vanilla-extract, Linaria) need a bundler plugin in every one of those,
   and styled-components a wrapper component per style; nothing here needs either.
2. **Vite 7, not 8.** Vite 8 transforms TypeScript with Oxc, which refuses mbse-schemas' non-const namespace exports
   (`Schemas.ts`, `export let Ref`); Vite 7 transforms with esbuild, as mbse-schemas' own portability test bundles.
   Vitest 4.1.12 (no known advisories) runs on Vite 7.
3. **`preserveSymlinks`** in both `tsconfig.json` and Vite: the siblings are `file:` dependencies, linked into
   `node_modules`, and their sources must resolve `@mbse/schemas` and `yaml` from here, as they have no
   `node_modules` of their own. `yaml` is therefore a dependency of this package. Vite also `dedupe`s `@mbse/schemas`
   and `yaml` (M4): a sibling that has a `node_modules` of its own (mbse-rest's, once its tests have run) would
   otherwise load a second copy of mbse-schemas, whose schemas are not instances of the first's classes.
4. **The corpus fetch answers 599** for a request the corpus holds no case for, a status outside HTTP's, with
   `{"error": ...}`, so the client raises its `ServiceError` and the UI shows the refusal in place of that view.
5. **A live server through the dev server's proxy.** `MBSE_REST_URL=http://host:port npm run dev` proxies `/rest` to
   it, so the browser sees one origin: mbse-rest's stub server sets no CORS headers. A production build calls
   `MBSE_REST_URL` directly, which then needs CORS from the server.
6. **CAP-009's schemas**: every registered name outside the framework's modules (`Schemas`, `Paths`, `Mutations`,
   `References`) whose schema is marked `ref` (a reference object schema, singletons' included) and has a non-empty
   description. A schema's label is its registered name. Its chips are CAP-006 with `x` given the schema, in a row
   scrolled sideways.
7. **CAP-010's sections**: one per object, grouped under its schema, the app's reference object schemas in the
   store's order (the singleton directories included), each extent CAP-006 with `x` given the schema, in frame order.
8. **CAP-011's entries** come from CAP-007 with `x` given each app schema (CONTRACT.md: `detail` takes a schema as
   `label` does), which holds every entry of each object's named adjacencies; each entry once, grouped by relation in
   the store's order, in the order met. Each linked object's chip is its CAP-006 chip from the object browser's views,
   or, where that is not loaded, its label view from the detail frame. An entry's own chip is its relation, its links'
   names and its properties. An entry is not an object, so it is not inspected.
9. **The inspector's adjacency lists**: one section per named adjacency of the object's schema, in the schema's order.
   Its `y` is each schema that declares an adjacency to the same relation through another link (several where a link
   is filled by several schemas, as `work.About`'s `topic`): one CAP-008 request each, their results together. Until
   they arrive, or where every one is refused, the section shows the detail view's own entries, labelled from it. An
   adjacency with no entry in the detail view is not requested.
10. **The schema of an object** is known where the UI asked for it (a chip of a schema's extent, CAP-008's `y`) or where
    exactly one schema fills the entry link it was reached through. Otherwise it is unknown: its label falls back to
    its path's last key alone, and the inspector lists its entries by relation instead of by adjacency (no CAP-008).
    mbse-schemas finds a reference's schema from its path (`References._implied`), but privately; see the report.
11. **The inspector's properties** are those besides its label's and its summary's (`Views.chip` over the detail
    frame), since the label is pinned at the top and the summary shown under it.
12. **Browsing history is the browser's.** The view and the inspected object (its reference's JSON, `Views.keyOf`, and
    its schema) are kept in the address bar's hash: inspecting another object pushes an entry; switching views and
    closing the inspector replace the current one, so that Back and Forward (the browser's, or the inspector's own
    buttons) move between inspected objects. A link to an object can be shared or reloaded.
13. **The inspector's actions** are Back and Forward, kept at the bottom (FEA-005); Close sits beside the label.
14. **Responsive layout**: on a screen 900px wide or more the inspector, once revealed, takes 2 of 5 columns beside the
    browser (3 of 5); narrower, it covers the browser. Fonts scale from 14px to 18px with the width (`clamp`). Values
    are abbreviated to one line (40 characters in a chip, cut at a word, with an ellipsis and the full value as a
    tooltip; floats to 4 significant digits), and summaries to two lines; the inspector shows them in full.
15. **Auto scrolling**: each region scrolls on its own (the browser, each CAP-009 row, the inspector's body between its
    pinned label and actions); the chip of the object inspected scrolls into view; the inspector's body returns to the
    top on each navigation.
16. **Views are kept once read** (`Service`), as they are reads; a refused one is asked again next time.
17. **Tests** are Vitest with Testing Library in jsdom, against the corpus through the same fetch the app uses.

### CAP-014: object properties as markdown (decided by the agent, for review)

18. **What is markdown**: every `Schemas.OfStr` value the UI shows: labels and summaries in chips and in the inspector,
    and the inspector's text property values. Rendered with `react-markdown`; inline (a label, a chip) unwraps
    paragraphs and shows links as their text, so that a chip stays one button. A chip's abbreviated property values
    stay plain text, since cutting markdown short can break it.
19. **What is editable**: the inspected object's own properties whose schema is `Schemas.OfStr`, set or not, in its
    schema's order (`textProperties`). An ownership key is a property of the directory's entry, never the object's,
    so none is editable here, as CAP-014 requires; entries' properties (a plan's dates) and values nested in value
    objects or containers are not edited in CAP-014. Where the UI does not know the object's schema (decision 10), it
    offers no Edit.
20. **The editor replaces the detail** while editing: one text area per text property, starting from what the
    object holds; the adjacencies return in view mode.
21. **Saving**: only properties whose text changed are sent, through mbse-rest's `client.edit` (its CONTRACT.md,
    Edits); a text area emptied clears its property. A save that changes nothing returns to view mode without a
    request. While the service commits, save mode disables the text areas, Cancel, Close, and Save, which reads
    "Saving…"; once committed, the inspector shows the detail the service gave back. A refused save returns to edit
    mode with the draft kept and the refusal shown.
22. **After a save, every view kept is dropped** (`Service.edit`), since an edit may change a chip, a label or an
    entry anywhere; navigating to another object discards an unsaved draft.
23. **Against the corpus**, only the edits it holds are accepted (`edit-task-title`, `edit-task-clear`); any other is
    refused (599), as any view the corpus lacks is.

### Comments: CAP-022 and CAP-018 to CAP-021 (decided by the agent, for review)

24. **Booleans as checkboxes** (CAP-022): a `Schemas.OfBool` value is a read-only checkbox in view mode, labelled by
    its property's name, and a checkbox in the editor; an absent boolean reads as unchecked, and is written only where
    the user changes it. The editor's fields (`Fields`) are shared by the object inspector and the adjacency
    inspector, and `editableProperties` gives them for an object schema or a relation's entries.
