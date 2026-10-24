/** The logical views the UI shows, read through mbse-rest's client (`@mbse/rest`): each request built by the client
 * (`Views.request`), each frame read back by it, and shaped here into what a chip, a section or the inspector shows.
 * Labels, summaries and chips are the client's (`Views.label`, `Views.summary`, `Views.chip`, `Views.entryLabel`), so
 * CAP-005's convention and fallbacks are applied in one place, mbse-rest's. */

import { Client, newStore, Views } from "@mbse/rest/Services/Rest/Client";
import { JSON as J } from "@mbse/schemas/Framework";
import { schemaOfLink } from "./schemas.js";

export type Frame = Views.Frame;

/** An object as a view shows it: its reference, and what the frame carries about it. */
export interface ObjectView {
  /** Its `References.OfObject`, in the service's store. */
  readonly reference: unknown;
  /** What tells it apart from any other (`Views.keyOf`). */
  readonly key: string;
  /** Its schema's registered name, where the UI knows it (CAP-005 uses it in the label's fallback). */
  readonly schema: string | undefined;
  /** CAP-005. */
  readonly label: string;
  /** CAP-005; empty where it holds none. */
  readonly summary: string;
  /** The other properties the frame assigns it, besides its label's and its summary's: a chip's (CAP-006), or every
   * other one a detail holds (CAP-007). */
  readonly properties: ReadonlyMap<string, unknown>;
}

/** A relation entry as a view shows it. */
export interface EntryView {
  readonly entry: unknown;
  readonly key: string;
  /** Its relation's registered name. */
  readonly relation: string;
  /** CAP-005: its relation's name and its linked objects' labels. */
  readonly label: string;
  /** Its properties. */
  readonly properties: ReadonlyMap<string, unknown>;
  /** Each link, in its order, and the object it links as the frame gives it. */
  readonly links: readonly { readonly link: string; readonly object: ObjectView }[];
}

/** A frame that binds `symbol` to `reference`, so that the client's readers apply to any object the frame witnesses. */
const rebound = (frame: Frame, reference: unknown, symbol = "x"): Frame =>
  ({ ...frame, binds: new Map([...frame.binds, [symbol, reference]]) });

/** The object `symbol` binds, as `frame` gives it: its label, its summary, and the other properties the frame assigns
 * it (`Views.chip`). */
export function objectOf(store: any, frame: Frame, symbol: string, schema?: string): ObjectView {
  const reference = frame.binds.get(symbol);
  return {
    reference,
    key: Views.keyOf(store, reference),
    schema,
    label: Views.label(store, frame, symbol, schema),
    summary: Views.summary(store, frame, symbol),
    properties: Views.chip(store, frame, symbol),
  };
}

/** Any object `frame` witnesses, by its reference: an entry's linked object, labelled from what the frame assigns it. */
export function objectAt(store: any, frame: Frame, reference: unknown, schema?: string): ObjectView {
  return objectOf(store, rebound(frame, reference), "x", schema);
}

/** The links of an entry (`References.OfEntry`), each name and `References.OfObject`, read through its visitors. */
function linksOf(entry: any): [string, unknown][] {
  const out: [string, unknown][] = [];
  entry.links.as_value((v: any) => v.as_container((c: any) => c.as_entries((entries: Iterator<[unknown, any]>) => {
    for (const [name, any] of { [Symbol.iterator]: () => entries }) any.as_object((o: any) => out.push([String(name), o]));
  })));
  return out;
}

/** An entry `frame` carries, its linked objects labelled from what the frame assigns them. */
export function entryOf(store: any, frame: Frame, entry: unknown): EntryView {
  const relation = Views.relationName(store, entry);
  return {
    entry,
    key: Views.keyOf(store, entry),
    relation,
    label: Views.entryLabel(store, frame, entry),
    properties: Views.entryProperties(entry),
    links: linksOf(entry).map(([link, reference]) =>
      ({ link, object: objectAt(store, frame, reference, schemaOfLink(store, relation, link)) })),
  };
}

/** The inspector's view of one object (CAP-007): its label, summary and every other property it holds, and the entries
 * of its named adjacencies. */
export interface DetailView {
  readonly object: ObjectView;
  readonly entries: readonly EntryView[];
}

/** One linked object of a CAP-008 view: its chip, and the entry that links it. */
export interface AdjacentView {
  readonly object: ObjectView;
  readonly entry: EntryView;
}

/** The service as the UI reaches it: mbse-rest's client and a store holding the app's schemas (CAP-002). Each view is
 * requested once and kept, as the views are reads; a refused one is asked again next time. */
export class Service {
  readonly store: any = newStore();
  private readonly frames = new Map<string, Promise<Frame[]>>();
  private loaded: Promise<string[]> | undefined;

  constructor(readonly client: Client) {}

  /** CAP-002: reads the schemas into the store, once. Gives every named schema's name. */
  schemas(): Promise<string[]> {
    this.loaded ??= this.client.loadSchemas(this.store);
    return this.loaded;
  }

  /** CAP-012: the frames of a view, its template filled by the client (`Views.request`), kept. */
  async view(kind: Views.Kind, given: Readonly<Record<string, unknown>>, adjacency?: string): Promise<Frame[]> {
    await this.schemas();
    const request = Views.request(this.store, kind, given, adjacency);
    const key = `${kind} ${J.dumps(request)}`;
    let found = this.frames.get(key);
    if (found === undefined) {
      found = this.client.view(this.store, kind, request);
      found.catch(() => this.frames.delete(key));
      this.frames.set(key, found);
    }
    return found;
  }

  /** CAP-006 over a schema's extent, loaded whole: each object's chip, in frame order. */
  async chips(schema: string): Promise<ObjectView[]> {
    await this.schemas();
    const frames = await this.view("chip", { x: this.store.registered(schema) });
    return frames.map((frame) => objectOf(this.store, frame, "x", schema));
  }

  /** CAP-007 of one object: every property it holds, and its named adjacencies' entries. */
  async detail(reference: unknown, schema?: string): Promise<DetailView> {
    const [frame] = await this.view("detail", { x: reference });
    if (frame === undefined) throw new Error("the service holds no such object");
    return {
      object: objectOf(this.store, frame, "x", schema),
      entries: frame.entries.map((entry) => entryOf(this.store, frame, entry)),
    };
  }

  /** CAP-008: the objects of schema `linked` that `reference`'s adjacency `adjacency` links, each its chip and the entry
   * linking it. */
  async adjacency(reference: unknown, adjacency: string, linked: string): Promise<AdjacentView[]> {
    await this.schemas();
    const frames = await this.view("adjacency", { x: reference, y: this.store.registered(linked) }, adjacency);
    return frames.flatMap((frame) => {
      const object = objectOf(this.store, frame, "y", linked);
      return frame.entries.map((entry) => ({ object, entry: entryOf(this.store, frame, entry) }));
    });
  }

  /** The entries every object of `schema` holds through its named adjacencies: CAP-007 with `x` given the schema, which
   * ranges over its extent (CAP-004), loaded whole. The relation browser (CAP-011) reads them. */
  async entries(schema: string): Promise<EntryView[]> {
    await this.schemas();
    const frames = await this.view("detail", { x: this.store.registered(schema) });
    return frames.flatMap((frame) => frame.entries.map((entry) => entryOf(this.store, frame, entry)));
  }

  /** A `References.OfObject` read back from its key (`Views.keyOf`), as the address bar carries it. */
  reference(key: string): unknown {
    return J.FromJSON(this.store)(this.store.References.OfObject.as_schema(), key);
  }
}
