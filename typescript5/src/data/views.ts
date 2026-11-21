/** The logical views the UI shows, read through mbse-rest's client (`@mbse/rest`): each request built by the client
 * (`Views.request`), each frame read back by it, and shaped here into what a chip, a section or the inspector shows.
 * Labels, summaries and chips are the client's (`Views.label`, `Views.summary`, `Views.chip`, `Views.entryLabel`), so
 * [CAP-005: label and summary view](mbse:mbse-basis/docs/capabilities/CAP-005.md)'s convention and fallbacks are applied in one place, mbse-rest's. */

import { Client, Gone, newStore, Views } from "@mbse/rest/Services/Rest/Client";
import type { Remote } from "@mbse/rest/Services/Rest/Store";
import { JSON as J } from "@mbse/schemas/Framework";
import { isFramework, schemaOfLink, singleton, singletonSchemas } from "./schemas.js";

export type Frame = Views.Frame;

/** An object as a view shows it: its reference, and what the frame carries about it. */
export interface ObjectView {
  /** Its `References.OfObject`, in the service's store. */
  readonly reference: unknown;
  /** What tells it apart from any other (`Views.keyOf`). */
  readonly key: string;
  /** Its ID: its path's last key (`Views.lastKey`), its owning entry's key values, or a singleton's name. */
  readonly id: string;
  /** Its schema's registered name, where the UI knows it ([CAP-005: label and summary view](mbse:mbse-basis/docs/capabilities/CAP-005.md) uses it in the label's fallback). */
  readonly schema: string | undefined;
  /** [CAP-005: label and summary view](mbse:mbse-basis/docs/capabilities/CAP-005.md). */
  readonly label: string;
  /** [CAP-005: label and summary view](mbse:mbse-basis/docs/capabilities/CAP-005.md); empty where it holds none. */
  readonly summary: string;
  /** The other properties the frame assigns it, besides its label's and its summary's: a chip's ([CAP-006: chip view](mbse:mbse-basis/docs/capabilities/CAP-006.md)), or every
   * other one a detail holds ([CAP-007: detail view](mbse:mbse-basis/docs/capabilities/CAP-007.md)). */
  readonly properties: ReadonlyMap<string, unknown>;
  /** [CAP-020: provenance display](mbse:mbse-basis/docs/capabilities/CAP-020.md): who created it and when, and who last wrote it and when, where the frame carries it ([CAP-015: transaction provenance](mbse:mbse-basis/docs/capabilities/CAP-015.md)). */
  readonly provenance: { readonly created?: Views.Written; readonly modified?: Views.Written };
}

/** A relation entry as a view shows it. */
export interface EntryView {
  readonly entry: unknown;
  readonly key: string;
  /** Its relation's registered name. */
  readonly relation: string;
  /** [CAP-005: label and summary view](mbse:mbse-basis/docs/capabilities/CAP-005.md): its relation's name and its linked objects' labels. */
  readonly label: string;
  /** Its properties. */
  readonly properties: ReadonlyMap<string, unknown>;
  /** Each link, in its order, and the object it links as the frame gives it. */
  readonly links: readonly { readonly link: string; readonly object: ObjectView }[];
}

/** The app's entries a frame carries: not the framework's, such as provenance's ([CAP-015: transaction provenance](mbse:mbse-basis/docs/capabilities/CAP-015.md)), which `Views.provenance`
 * reads. */
const appEntries = (store: any, frame: Frame): unknown[] =>
  frame.entries.filter((entry) => !isFramework(Views.relationName(store, entry)));

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
    id: Views.lastKey(store, reference),
    schema,
    label: Views.label(store, frame, symbol, schema),
    summary: Views.summary(store, frame, symbol),
    properties: Views.chip(store, frame, symbol),
    provenance: Views.provenance(store, frame, reference),
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

/** The inspector's view of one object ([CAP-007: detail view](mbse:mbse-basis/docs/capabilities/CAP-007.md)): its label, summary and every other property it holds, and the entries
 * of its named adjacencies. */
export interface DetailView {
  readonly object: ObjectView;
  /** Every property the object holds, its label's and summary's included, each its value: what an edit starts from
   * ([CAP-014: properties as markdown](mbse:mbse-basis/docs/capabilities/CAP-014.md)). */
  readonly values: ReadonlyMap<string, unknown>;
  readonly entries: readonly EntryView[];
}

/** One linked object of a [CAP-008: adjacency as a list of chips](mbse:mbse-basis/docs/capabilities/CAP-008.md) view: its chip, and the entry that links it. */
export interface AdjacentView {
  readonly object: ObjectView;
  readonly entry: EntryView;
}

/** The service's change feed, as the UI follows it: mbse-rest's `Remote`, the service as a layer below, made when the
 * follow starts, and again after the feed is gone (`Gone`, 410), as after the service restarted. */
export type Feed = () => Remote;

/** The service as the UI reaches it: mbse-rest's client and a store holding the app's schemas ([CAP-002: named schema list](mbse:mbse-basis/docs/capabilities/CAP-002.md)), and, where
 * it is given a feed, the follow of what the service's store commits.
 *
 * Every read is within a transaction or through a follow ([CAP-315: every read within a transaction or through a follow](mbse:mbse-basis/docs/capabilities/CAP-315.md)). A view is a transaction the service executes
 * within one of its store's, and gives back as frames that hold each object by its reference and the values it
 * assigns: what the UI keeps outlives that transaction, and is stale from then on. So each view is kept only until the
 * follow gives a transaction the service committed, any one, the UI's own edits among them: then every view kept is
 * dropped, and the listeners told (`version`), so that what shows a view reads it again. A refused view is asked again
 * next time.
 *
 * The UI holds no cache layer of the service's store (mbse-rest's `Store`): a view is filled by the service, which the
 * view's transaction does not express, and every view starts from a schema's extent or from an object given by
 * reference that a cache layer would not hold, which its completeness rule forwards to the service in any case. The
 * store it holds is the schemas', which a schema object is read from with no transaction, as CAP-315 allows. */
export class Service {
  readonly store: any = newStore();
  private readonly frames = new Map<string, Promise<Frame[]>>();
  private loaded: Promise<string[]> | undefined;
  private remote: Remote | undefined;
  private unfollow: (() => void) | undefined;
  private given = 0;
  private lapsed = false;
  private changes = 0;
  private readonly listeners = new Set<() => void>();
  /** Why the change feed was last not read, until it is read again. */
  followError: unknown = undefined;

  constructor(readonly client: Client, private readonly feed?: Feed) {}

  /** How many times the follow has dropped the views kept: what shows a view reads it again when this changes. */
  get version(): number {
    return this.changes;
  }

  /** Calls `listener` whenever `version` changes; gives back a function that ends it. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Follows the service's change feed, where a feed was given: once at once, then every `every` milliseconds, in the
   * follow mode `POLLED`, so that the UI reads a poll behind. Gives back a function that stops it. */
  start(every = 2000): () => void {
    if (this.feed === undefined) return () => undefined;
    this.poll();
    const timer = setInterval(() => this.poll(), every);
    return () => clearInterval(timer);
  }

  /** Reads the change feed to its head, where a feed was given: each transaction it gives drops every view kept, and
   * the listeners are told once. Gives how many it gave. A feed that cannot be read is read again on the next poll; one
   * gone is followed again at once, from its head, and every view dropped, as what was missed is not known. */
  poll(): number {
    if (this.feed === undefined) return 0;
    const before = this.given;
    try {
      (this.remote ?? this.connect()).poll();
      this.followError = undefined;
    } catch (error) {
      this.followError = error;
      if (error instanceof Gone) {
        this.disconnect();
        this.given += 1;
        try {
          this.connect();
        } catch (again) {
          this.followError = again;
        }
      }
    }
    const given = this.given - before;
    if (given > 0) this.changed();
    return given;
  }

  /** The follow begun, the feed read from its head. Where an attempt before failed, a view read since may be older than
   * that head, and is dropped. */
  private connect(): Remote {
    let remote: Remote;
    try {
      remote = this.feed!();
    } catch (error) {
      this.lapsed = true;
      throw error;
    }
    this.unfollow = remote.follow(() => { this.given += 1; });
    this.remote = remote;
    if (this.lapsed && this.frames.size > 0) this.given += 1;
    this.lapsed = false;
    return remote;
  }

  private disconnect(): void {
    this.unfollow?.();
    this.unfollow = undefined;
    this.remote = undefined;
  }

  private changed(): void {
    this.frames.clear();
    this.changes += 1;
    for (const listener of [...this.listeners]) listener();
  }

  /** [CAP-002: named schema list](mbse:mbse-basis/docs/capabilities/CAP-002.md): reads the schemas into the store, once. Gives every named schema's name. Every view waits for it, so
   * the follow begins here, before the first view is read, that none is older than the feed's head. */
  schemas(): Promise<string[]> {
    if (this.loaded === undefined && this.feed !== undefined && this.remote === undefined) {
      try {
        this.connect();
      } catch (error) {
        this.followError = error; // begun on the next poll
      }
    }
    this.loaded ??= this.client.loadSchemas(this.store);
    return this.loaded;
  }

  /** [CAP-012: logical view endpoints](mbse:mbse-basis/docs/capabilities/CAP-012.md): the frames of a view, its template filled by the client (`Views.request`), kept. */
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

  /** [CAP-006: chip view](mbse:mbse-basis/docs/capabilities/CAP-006.md) over a schema's extent, loaded whole: each object's chip, in frame order. */
  async chips(schema: string): Promise<ObjectView[]> {
    await this.schemas();
    const frames = await this.view("chip", { x: this.store.registered(schema) });
    return frames.map((frame) => objectOf(this.store, frame, "x", schema));
  }

  /** [CAP-007: detail view](mbse:mbse-basis/docs/capabilities/CAP-007.md) of one object: every property it holds, and its named adjacencies' entries. */
  async detail(reference: unknown, schema?: string): Promise<DetailView> {
    const [frame] = await this.view("detail", { x: reference });
    return this.detailOf(frame, schema);
  }

  /** [CAP-014: properties as markdown](mbse:mbse-basis/docs/capabilities/CAP-014.md): writes `values` to the object's properties (`null` clears one), and gives its detail as the edit left
   * it, once the service has committed it. Every view kept is dropped, since an edit may change any of them. */
  async edit(reference: unknown, values: Readonly<Record<string, unknown>>, schema?: string): Promise<DetailView> {
    await this.schemas();
    const [frame] = await this.client.edit(this.store, reference, values);
    this.frames.clear();
    return this.detailOf(frame, schema);
  }

  /** [CAP-018: adjacency inspector](mbse:mbse-basis/docs/capabilities/CAP-018.md): proposes a new object of `schema` through `reference`'s `adjacency`, linked through `link`, with its
   * properties `values` and its entry's `entry`, and gives the inbound object's detail once committed. Every view
   * kept is dropped, as after an edit. */
  async propose(reference: unknown, adjacency: string, link: string, schema: string,
      values: Readonly<Record<string, unknown>>, entry: Readonly<Record<string, unknown>> = {}): Promise<DetailView> {
    await this.schemas();
    const [frame] = await this.client.propose(this.store, reference, adjacency, link, this.store.registered(schema),
      values, entry);
    this.frames.clear();
    return this.detailOf(frame);
  }

  private detailOf(frame: Frame | undefined, schema?: string): DetailView {
    if (frame === undefined) throw new Error("the service holds no such object");
    return {
      object: objectOf(this.store, frame, "x", schema),
      values: Views.properties(this.store, frame, "x"),
      entries: appEntries(this.store, frame).map((entry) => entryOf(this.store, frame, entry)),
    };
  }

  /** [CAP-008: adjacency as a list of chips](mbse:mbse-basis/docs/capabilities/CAP-008.md): the objects of schema `linked` that `reference`'s adjacency `adjacency` links, each its chip and the entry
   * linking it. */
  async adjacency(reference: unknown, adjacency: string, linked: string): Promise<AdjacentView[]> {
    await this.schemas();
    const frames = await this.view("adjacency", { x: reference, y: this.store.registered(linked) }, adjacency);
    return frames.flatMap((frame) => {
      const object = objectOf(this.store, frame, "y", linked);
      return appEntries(this.store, frame).map((entry) => ({ object, entry: entryOf(this.store, frame, entry) }));
    });
  }

  /** The entries every object of `schema` holds through its named adjacencies: [CAP-007: detail view](mbse:mbse-basis/docs/capabilities/CAP-007.md) with `x` given the schema, which
   * ranges over its extent ([CAP-004: logical view templates](mbse:mbse-basis/docs/capabilities/CAP-004.md)), loaded whole. The relation browser ([CAP-011: relation browser](mbse:mbse-basis/docs/capabilities/CAP-011.md)) reads them. */
  async entries(schema: string): Promise<EntryView[]> {
    await this.schemas();
    const frames = await this.view("detail", { x: this.store.registered(schema) });
    return frames.flatMap((frame) => appEntries(this.store, frame).map((entry) => entryOf(this.store, frame, entry)));
  }

  /** A `References.OfObject` read back from its key (`Views.keyOf`), as the address bar carries it. */
  reference(key: string): unknown {
    return J.FromJSON(this.store)(this.store.References.OfObject.as_schema(), key);
  }
}

/** One step of an object's ownership path: an object, by its key (`Views.keyOf`), named by its singleton's name or its
 * owning entry's key values, and its schema where the UI knows it (a singleton's). */
export interface Crumb {
  readonly key: string;
  readonly name: string;
  readonly schema: string | undefined;
}

/** The object's ownership path, from its singleton to itself ([FEA-003: no-code logical views](mbse:mbse-basis/docs/features/FEA-003.md)'s identity): each object its path passes, the
 * object itself last. A singleton's path is itself alone; an object whose key is not a path, empty. */
export function ownership(store: any, key: string): Crumb[] {
  let path: any;
  try {
    path = globalThis.JSON.parse(key)?.path;
  } catch {
    return [];
  }
  if (typeof path?.singleton !== "string") return [];
  const keyAt = (steps: readonly any[]): string => {
    let next: any = { target: {} };
    for (const step of [...steps].reverse()) next = { entry: { ...step, next } };
    const plain = { path: { singleton: path.singleton, next } };
    return Views.keyOf(store, J.FromJSON(store)(store.References.OfObject.as_schema(), globalThis.JSON.stringify(plain)));
  };
  const crumbs: Crumb[] = [{ key: keyAt([]), name: path.singleton,
    schema: singletonSchemas(store).find((name) => singleton(store, name) === path.singleton) }];
  const steps: any[] = [];
  for (let next = path.next; next?.entry !== undefined; next = next.entry.next) {
    const { next: _, ...step } = next.entry;
    steps.push(step);
    crumbs.push({ key: keyAt(steps), name: Object.values(step.properties ?? {}).map(String).join(" "), schema: undefined });
  }
  return crumbs;
}
