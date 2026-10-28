# mbse-react

A React UI for any mbse-schemas app: an index site driven exclusively by the schema, so that any MBSE app's data can be
browsed and inspected with no app-specific UI code.

## Why

An MBSE app's schemas already say what its objects are, what properties they hold and how they relate. Building a UI
per app repeats that, and drifts from it. This UI reads only the schemas and the logical views that mbse-rest serves
for them (label, chip, detail, adjacency), so a new app, or a changed schema, needs no UI code to be browsed: the
schema, object and relation browsers and the object inspector (mbse-basis [FEA-004: index site browser views](../mbse-basis/docs/features/FEA-004.md) and [FEA-005: inspector views](../mbse-basis/docs/features/FEA-005.md)) work for any
app the service holds. It reads the service only through mbse-rest's TypeScript client (`@mbse/rest`), whose calls are
mbse-rest's [`docs/CONTRACT.md`](../mbse-rest/docs/CONTRACT.md).

It is React and TypeScript, with its styles in TypeScript (Emotion), responsive from a phone to a wide screen. How it
is built, and every choice made where the specification is silent, is in [docs/DESIGN.md](docs/DESIGN.md).

## Running it

It depends on [mbse-schemas](https://github.com/pitaman71/mbse-schemas) and
[mbse-rest](https://github.com/pitaman71/mbse-rest) as checkouts beside this repository, pinned in
[siblings.json](siblings.json). Node 22 or later.

```sh
cd typescript5
npm install
npm run typecheck && npm test   # type-checking, then the behavior tests against the golden corpus
```

### Against the golden corpus (the default)

```sh
npm run dev                     # http://localhost:5173
```

The app serves mbse-rest's golden corpus ([`mbse-rest/conformance/`](../mbse-rest/conformance)) through a fetch of its own, so no server runs.
The corpus holds a case for every view the UI asks of the WorkTracker seed (mbse-rest's generated `ui-*` cases): every
schema's chips and entries, every object's detail, and every adjacency view. A view it holds no case for (another
app's, say) is shown as refused, in its place.

### Against a live mbse-rest server

Start the server (from mbse-rest's [`python3/`](../mbse-rest/python3)):

```sh
uv run --with uvicorn uvicorn --factory mbse.Services.Rest.Service:work_tracker   # http://localhost:8000
```

then the app, given its URL:

```sh
MBSE_REST_URL=http://localhost:8000 npm run dev
```

The dev server proxies `/rest` to that URL, so the browser sees one origin. A production build (`npm run build`) calls
`MBSE_REST_URL` directly, which then needs the server to allow the app's origin (CORS).

## Using it

- **Schemas**, **Objects**, **Relations**: the three browsers, each a scrollable view of sections.
- A click or tap on an object's chip opens it in the inspector: its label stays at the top, its properties and
  adjacencies scroll beneath, Back and Forward stay at the bottom. The address bar holds the view and the object, so
  the browser's Back and Forward, a reload and a shared link all work.
