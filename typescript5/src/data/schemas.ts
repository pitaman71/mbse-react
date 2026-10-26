/** What the UI reads from the schemas the client's store holds (CAP-002): which schemas the browsers show, and each
 * object schema's named adjacencies, whose entries the inspector lists (FEA-005, CAP-008). Schemas are read as data,
 * through their public members (`name`, `description`, `ref`, `adjacencies`, `anonymous`). */

import { schemaNames } from "@mbse/rest/Services/Rest/Client";

/** The framework's modules, whose schemas the schema browser leaves out (CAP-009). */
export const FRAMEWORK_MODULES = ["Schemas", "Paths", "Mutations", "References", "Parametrics", "Provenance"] as const;

export const isFramework = (name: string): boolean =>
  (FRAMEWORK_MODULES as readonly string[]).includes(name.split(".")[0] ?? "");

/** A schema by its registered name, or undefined. */
export function schema(store: any, name: string): any {
  try {
    return store.registered(name) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Whether a schema object is a reference object schema: `.ref(true)`, an object schema's alone. */
const isReferenceObject = (s: any): boolean => s?.ref === true && s.adjacencies instanceof Map;

/** The app's reference object schemas, by registered name, in the store's order: every named schema outside the
 * framework that is marked `ref`. The object browser (CAP-010) shows their extents, and the relation browser (CAP-011)
 * reads the entries their objects' adjacencies hold. */
export function appObjectSchemas(store: any): string[] {
  return schemaNames(store).filter((name) => !isFramework(name) && isReferenceObject(schema(store, name)));
}

/** CAP-010: the app's reference object schemas that name a singleton (the directories), in the store's order. */
export function singletonSchemas(store: any): string[] {
  return appObjectSchemas(store).filter((name) => typeof schema(store, name)?.singleton === "string");
}

/** A schema's singleton name, or "" where it names none. */
export function singleton(store: any, name: string): string {
  const n: unknown = schema(store, name)?.singleton;
  return typeof n === "string" ? n : "";
}

/** A schema's description, or "" where it has none. */
export function description(store: any, name: string): string {
  const d: unknown = schema(store, name)?.description;
  return typeof d === "string" ? d : "";
}

/** CAP-009: the schemas the schema browser shows, those with a registered name and a description, and of those only
 * the app's reference object schemas. */
export function browsableSchemas(store: any): string[] {
  return appObjectSchemas(store).filter((name) => description(store, name) !== "");
}

/** The app's relation schemas, by registered name, in the store's order. */
export function appRelations(store: any): string[] {
  return schemaNames(store).filter((name) => !isFramework(name) && schema(store, name)?.entry !== undefined
    && schema(store, name)?.adjacencies === undefined);
}

/** Every adjacency each reference object schema declares, named or anonymous, with its schema's name. */
function declared(store: any): { owner: string; adjacency: any }[] {
  return appObjectSchemas(store).flatMap((name) => {
    const s = schema(store, name);
    return [...s.adjacencies.values(), ...(s.anonymous ?? [])].map((adjacency: any) => ({ owner: name, adjacency }));
  });
}

/** The schemas whose objects fill `link` of `relation`: those declaring an adjacency to it through that link. */
export function schemasOfLink(store: any, relation: string, link: string): string[] {
  return [...new Set(declared(store).filter(({ adjacency }) => adjacency.relation?.name === relation
    && adjacency.me === link).map(({ owner }) => owner))];
}

/** The one schema whose objects fill `link` of `relation`, or undefined where none or several do. */
export function schemaOfLink(store: any, relation: string, link: string): string | undefined {
  const found = schemasOfLink(store, relation, link);
  return found.length === 1 ? found[0] : undefined;
}

/** A named adjacency of an object schema, as the inspector lists it. */
export interface Adjacency {
  /** Its name, the member of the object's schema. */
  readonly name: string;
  /** Its relation's registered name. */
  readonly relation: string;
  /** The link the object fills. */
  readonly me: string;
  /** The schemas whose objects its entries link, on the relation's other links: CAP-008's `y`, one request each. */
  readonly linked: readonly string[];
  /** The relation's other link, where it has exactly one: where a proposal (CAP-018) links its new object. */
  readonly link: string | undefined;
  /** Whether it is the object's ownership adjacency (to its directory). */
  readonly owner: boolean;
  /** Whether the object may have several entries in it: no `unique` clause lets the object determine the rest. */
  readonly toMany: boolean;
}

/** Whether `me` determines the rest of an entry, its other links and its properties: some `unique(S)` clause holds all
 * of them but not `me`. */
function toOne(relation: any, me: string): boolean {
  const names = [...(relation?.entry?.links?.keys?.() ?? []), ...(relation?.entry?.properties?.keys?.() ?? [])];
  const others = names.map(String).filter((l) => l !== me);
  return [...(relation?.uniques ?? [])].some((clause: Iterable<unknown>) => {
    const names = new Set([...clause].map(String));
    return !names.has(me) && others.every((l) => names.has(l));
  });
}

/** An object schema's named adjacencies, in its order (CAP-007 lists their entries, CAP-008 each one's chips). */
export function adjacencies(store: any, name: string): Adjacency[] {
  const s = schema(store, name);
  if (!isReferenceObject(s)) return [];
  const all = declared(store);
  return [...s.adjacencies].map(([adjacency, a]: [string, any]) => {
    const relation = String(a.relation?.name ?? "");
    const linked = [...new Set(all.filter(({ adjacency: other }) => other.relation?.name === relation
      && other.me !== a.me).map(({ owner }) => owner))];
    const links = [...(a.relation?.entry?.links?.keys?.() ?? [])].map(String).filter((l) => l !== String(a.me));
    return { name: adjacency, relation, me: String(a.me), linked, link: links.length === 1 ? links[0] : undefined,
      owner: a.owner === true, toMany: !toOne(a.relation, String(a.me)) };
  });
}

/** CAP-014: the properties of an object schema whose schema is `Schemas.OfStr`, read as markdown and editable, in the
 * schema's order. An ownership key is an entry's property, never the object's, so none is among them. */
export function textProperties(store: any, name: string): string[] {
  const properties = schema(store, name)?.properties;
  if (!(properties instanceof Map)) return [];
  return [...properties].filter(([, p]: [string, any]) => p?.schema?.name === "Schemas.OfStr").map(([n]) => n);
}

/** A property the UI edits, and how: text as markdown (CAP-014), a boolean as a checkbox (CAP-022). */
export interface Field {
  readonly name: string;
  readonly kind: "text" | "bool";
}

const KINDS: Readonly<Record<string, Field["kind"]>> = { "Schemas.OfStr": "text", "Schemas.OfBool": "bool" };

/** The properties of an object schema, or of a relation's entries, that the UI edits, in the schema's order: those
 * whose schema is `Schemas.OfStr` or `Schemas.OfBool`. An ownership key is an entry's property, never the object's,
 * so none is among an object's. */
export function editableProperties(store: any, name: string): Field[] {
  const s = schema(store, name);
  const properties = s?.properties ?? s?.entry?.properties;
  if (!(properties instanceof Map)) return [];
  return [...properties].flatMap(([n, p]: [string, any]) => {
    const kind = KINDS[String(p?.schema?.name)];
    return kind === undefined ? [] : [{ name: n, kind }];
  });
}
