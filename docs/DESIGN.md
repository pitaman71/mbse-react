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
| `ui/navigation.tsx` | The current view, kept in the address bar, and the inspector's own history |
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
7. **CAP-010's sections** (revised for CAP-010's singletons): one per app schema that names a singleton, in the
   store's order, headed by the singleton's name. Its chips are the objects the singleton holds: CAP-008 from the
   singleton's reference (CAP-006 over its schema gives it) over each named adjacency but its ownership one, for each
   schema the adjacency links; each object once, in frame order. The singleton's own chip is not shown.
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
12. **The inspector's history is its own** (revised: it was the browser's). The address bar's hash holds the view
    alone; switching views replaces its entry. The inspector keeps the objects inspected in a history of its own,
    never the browser's: inspecting another object pushes onto it, dropping what lay ahead; the inspector's Back and
    Forward move along it, each disabled at its end; closing the inspector forgets it. An inspected object is
    therefore neither in a shared link nor kept over a reload.
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
25. **"+" on an adjacency** (CAP-018) wherever its relation has exactly one other link and it is not the object's
    ownership adjacency (proposing a new directory means nothing); where several schemas fill the other link, the
    proposer offers a choice. Every named adjacency is shown as a list, empty or not, so that "+" can add the first.
26. **The proposer** shows a field for each editable property (text, boolean) of the new object's schema and of the
    relation's entries; only what the user filled is sent (`Service.propose`, mbse-rest's `client.propose`).
27. **After a save**, an edit's or a proposal's, the inspector's detail and every list are read again, since the
    service's views have changed (every view kept is dropped).
28. **Adjacencies only in a detail** (CAP-019, as revised): an object's adjacency lists are the end of its detail, in
    its schema's order, each a grid of chips (decision 33); no list is nested under a chip. A deeper level is a click away: a topic's
    detail ends with its threads, a thread's (inspected) with its replies. (First built as nesting one level deep
    under each linked chip, which the user found confusing: "Showing comments *under* the chip is doubly so.")
29. **Editing an existing entry's properties with its linked object's** (the rest of CAP-018) is not built yet.
30. **The tab's session** (CAP-015): an id made once per browser tab and kept for its life (`sessionStorage`), the
    browser's locale (`navigator.language`) and a kind of device (`touch` or `desktop`, by its pointer), given to a
    live service's client, which names the session in a header and writes the locale and device into each write.
    Against the corpus no session is sent, so that requests stay the corpus's.
31. **Provenance is read, not listed** (CAP-020): a frame's framework entries (`Provenance.*`) are kept out of the
    detail's, the relation browser's and the adjacency lists' entries; `Views.provenance` reads them. The inspector
    shows "created by … · when" and "edited by … · when" under the label; each linked object in an adjacency list,
    "{identity} @ {when}" as its pill's header (decision 33). Times are in the browser's locale and time zone (`Intl.DateTimeFormat`). The schema
    browser leaves out `Parametrics` and `Provenance` with the other framework modules.
32. **Creation order** (CAP-021): an adjacency list is sorted by creation time where every item it shows has one, and
    kept in frame order otherwise; ties keep frame order.
33. **An adjacency's preview is one chip per entry** (CAP-019): two columns, the entry's properties on the left and, on
    the right, a pill `ID : name` of the linked object, a click on which inspects it. Its ID is its path's last key
    (`Views.lastKey`: its owning entry's key values, or a singleton's name). Its name is its own label; where it has
    none (CAP-005's fallback), its summary, else its first text property (a comment's text), either shown as prose,
    the pill wrapping to three lines; else its schema's name. Where the entry has no properties, the pill takes the
    whole chip. Where the object's provenance holds its creation (CAP-020), the pill is headed, in small italics, by
    `{identity} @ {datestamp}`; no byline sits outside the chip. The object's other properties wait for its detail.
    (First built as the object's chip beside its entry's, which read as two things for one: "why are there two chips
    but one thingy?"; then with the byline under the chip, "disembodied from the pill".)
34. **The ownership path is a breadcrumb** (CAP-019): an owned object's inspector header shows its path, read from its
    reference, as `singleton › key › …`: its singleton's name, then each owning entry's key values, itself last; each
    ancestor is inspected on a click (a singleton with its directory schema; a deeper owner, were there one, with no
    schema known). The ownership adjacency (an adjacency marked `owner`) gets no list in the detail. A singleton has
    no breadcrumb. No subtitle repeats a schema's name: the inspected object's schema and each adjacency's relation
    are tooltips on the label and the section's heading, since the breadcrumb and the adjacency's name say as much.
