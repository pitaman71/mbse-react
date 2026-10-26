/** CAP-023: the relation inspector's sibling context, and the CAP-008 views it and the adjacency lists read. */

import { adjacencies, type Adjacency } from "../data/schemas.js";
import type { AdjacentView, EntryView, ObjectView, Service } from "../data/views.js";
import { byCreation } from "./Byline.js";
import type { Bound, RelationAnchor, Target } from "./navigation.js";

/** CAP-008 from `reference` through `adjacency`, for each schema its entries may link, the results together; the
 * refusals beside them, and whether every one was refused. */
export async function adjacentViews(service: Service, reference: unknown, adjacency: Adjacency):
    Promise<{ readonly views: AdjacentView[]; readonly errors: Error[]; readonly all: boolean }> {
  const settled = await Promise.allSettled(adjacency.linked.map((y) => service.adjacency(reference, adjacency.name, y)));
  const views: AdjacentView[] = [];
  const errors: Error[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") views.push(...r.value);
    else errors.push(r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
  }
  return { views, errors, all: errors.length === settled.length };
}

/** CAP-023: the anchor of an object inspected from an adjacency list (or a
 * directory's section on the Objects tab, CAP-010): the adjacency's relation, the link the object
 * fills in the entry, and the adjacency's own link bound to the list's owner. None where the link is not known. */
export function anchorOf(owner: Bound, adjacency: Adjacency, object: ObjectView, entry: EntryView): RelationAnchor | undefined {
  const link = entry.links.find((l) => l.link !== adjacency.me && l.object.key === object.key)?.link ?? adjacency.link;
  return link === undefined ? undefined
    : { relation: adjacency.relation, link, links: { [adjacency.me]: owner }, properties: {} };
}

/** The anchor's sibling context, in an adjacency list's order (CAP-021): every object the relation's entries link
 * through the anchor's link, of the entries that agree with its bindings, each once. Read through CAP-008 from a bound
 * link whose object's schema names an adjacency to the relation through it; the other bindings, links and property
 * values, are matched against each entry. Empty where no bound link has such an adjacency. */
export async function siblings(service: Service, anchor: RelationAnchor): Promise<Target[]> {
  await service.schemas();
  const start = Object.entries(anchor.links).flatMap(([link, bound]) => {
    const adjacency = bound.schema === undefined ? undefined : adjacencies(service.store, bound.schema)
      .find((a) => a.relation === anchor.relation && a.me === link);
    return adjacency === undefined ? [] : [{ bound, adjacency }];
  })[0];
  if (start === undefined) return [];
  const { views } = await adjacentViews(service, service.reference(start.bound.key), start.adjacency);
  const agrees = ({ object, entry }: AdjacentView): boolean =>
    entry.links.some((l) => l.link === anchor.link && l.object.key === object.key)
    && Object.entries(anchor.links).every(([link, bound]) =>
      entry.links.some((l) => l.link === link && l.object.key === bound.key))
    && Object.entries(anchor.properties).every(([name, value]) => entry.properties.get(name) === value);
  const seen = new Set<string>();
  return byCreation(views.filter(agrees)).flatMap(({ object }) => {
    if (seen.has(object.key)) return [];
    seen.add(object.key);
    return [{ key: object.key, schema: object.schema, anchor }];
  });
}
