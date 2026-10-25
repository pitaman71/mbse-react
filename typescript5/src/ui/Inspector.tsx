/** The object inspector (FEA-005): a shared panel that shows the detail view (CAP-007) of the object last inspected. Its
 * label stays at the top and its actions at the bottom, while the properties and adjacencies scroll between them; each
 * named adjacency lists its linked objects' chips (CAP-008). */

import { useEffect, useRef } from "react";
import { adjacencies, type Adjacency } from "../data/schemas.js";
import type { AdjacentView, DetailView, EntryView, ObjectView } from "../data/views.js";
import { EntryChip, Failure, Loading, ObjectChip } from "./Chip.js";
import { useLoad } from "./load.js";
import { type Target, useNavigation } from "./navigation.js";
import { useService } from "./service.js";
import * as s from "./styles.js";
import { full } from "./values.js";

/** The entries of `detail` that belong to `adjacency`: of its relation, with the object in its link. */
export function entriesOf(detail: DetailView, adjacency: Adjacency): EntryView[] {
  return detail.entries.filter((e) => e.relation === adjacency.relation
    && e.links.some((l) => l.link === adjacency.me && l.object.key === detail.object.key));
}

/** The objects an entry links besides `me`. */
const others = (entry: EntryView, me: string): ObjectView[] =>
  entry.links.filter((l) => l.link !== me).map((l) => l.object);

/** One linked object and the entry that links it, its entry properties beside its chip. */
function Linked({ object, entry }: { readonly object: ObjectView; readonly entry: EntryView }) {
  return (
    <div className={s.entryRow}>
      <ObjectChip object={object} />
      {entry.properties.size > 0 && <EntryChip entry={entry} />}
    </div>
  );
}

/** CAP-008 for one named adjacency: one request for each schema its entries may link, the results together. Until
 * they arrive, or where every one is refused, the detail view's own entries are shown, labelled from it. */
function AdjacencyList({ reference, adjacency, entries }: {
  readonly reference: unknown; readonly adjacency: Adjacency; readonly entries: readonly EntryView[];
}) {
  const service = useService();
  const loaded = useLoad(async () => {
    const settled = await Promise.allSettled(adjacency.linked.map((y) => service.adjacency(reference, adjacency.name, y)));
    const views: AdjacentView[] = [];
    const errors: Error[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") views.push(...r.value);
      else errors.push(r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
    }
    return { views, errors, all: errors.length === settled.length };
  }, [service, reference, adjacency.name, adjacency.linked.join(" ")]);
  const fallback = entries.flatMap((entry) => others(entry, adjacency.me).map((object) => ({ object, entry })));
  const shown = loaded.state === "done" && !loaded.value.all ? loaded.value.views : fallback;
  return (
    <section className={s.section} aria-label={adjacency.name}>
      <h3 className={s.sectionTitle}>{adjacency.name} <span className={s.chipSchema}>({entries.length})</span></h3>
      <p className={s.muted}>{adjacency.relation}</p>
      <div className={s.chipGrid}>
        {shown.map(({ object, entry }) => <Linked key={`${entry.key} ${object.key}`} object={object} entry={entry} />)}
      </div>
      {loaded.state === "loading" && <Loading />}
      {loaded.state === "done" && loaded.value.errors.map((e, i) => <Failure key={i} error={e} />)}
    </section>
  );
}

/** Entries grouped by relation, where the object's schema, and so its named adjacencies, is not known. */
function EntriesByRelation({ detail }: { readonly detail: DetailView }) {
  const relations = [...new Set(detail.entries.map((e) => e.relation))];
  return relations.map((relation) => (
    <section key={relation} className={s.section} aria-label={relation}>
      <h3 className={s.sectionTitle}>{relation}</h3>
      <div className={s.chipGrid}>
        {detail.entries.filter((e) => e.relation === relation).flatMap((entry) => entry.links
          .filter((l) => l.object.key !== detail.object.key)
          .map((l) => <Linked key={`${entry.key} ${l.link}`} object={l.object} entry={entry} />))}
      </div>
    </section>
  ));
}

function Detail({ target, detail }: { readonly target: Target; readonly detail: DetailView }) {
  const service = useService();
  const named = target.schema === undefined ? undefined : adjacencies(service.store, target.schema);
  return (
    <>
      {detail.object.summary !== "" && <p>{detail.object.summary}</p>}
      {detail.object.properties.size > 0 && (
        <section className={s.section} aria-label="properties">
          <dl className={s.detailProps}>
            {[...detail.object.properties].map(([name, value]) => (
              <div key={name} style={{ display: "contents" }}><dt>{name}</dt><dd>{full(value)}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {named === undefined ? <EntriesByRelation detail={detail} /> : named.map((adjacency) => {
        const entries = entriesOf(detail, adjacency);
        return entries.length === 0
          ? (
            <section key={adjacency.name} className={s.section} aria-label={adjacency.name}>
              <h3 className={s.sectionTitle}>{adjacency.name} <span className={s.chipSchema}>(0)</span></h3>
            </section>
          )
          : <AdjacencyList key={adjacency.name} reference={detail.object.reference} adjacency={adjacency} entries={entries} />;
      })}
    </>
  );
}

/** The panel: hidden until an object is inspected; each inspection clears it, shows loading, and fetches the detail. */
export function Inspector() {
  const { place, close } = useNavigation();
  const service = useService();
  const target = place.inspect;
  const body = useRef<HTMLDivElement>(null);
  const loaded = useLoad(async () => {
    if (target === undefined) return undefined;
    await service.schemas();
    return service.detail(service.reference(target.key), target.schema);
  }, [service, target?.key, target?.schema]);
  useEffect(() => { body.current?.scrollTo?.({ top: 0 }); }, [target?.key]);
  if (target === undefined) return null;
  const label = loaded.state === "done" && loaded.value !== undefined ? loaded.value.object.label : undefined;
  return (
    <aside className={s.inspector} aria-label="inspector">
      <header className={s.inspectorHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className={s.inspectorLabel}>{label ?? (loaded.state === "error" ? "Not available" : "Loading…")}</h2>
          {target.schema !== undefined && <div className={s.chipSchema}>{target.schema}</div>}
        </div>
        <button type="button" className={s.button} onClick={close} aria-label="Close the inspector">✕</button>
      </header>
      <div ref={body} className={s.scroller} key={target.key}>
        {loaded.state === "loading" && <Loading />}
        {loaded.state === "error" && <Failure error={loaded.error} />}
        {loaded.state === "done" && loaded.value !== undefined && <Detail target={target} detail={loaded.value} />}
      </div>
      <footer className={s.inspectorActions}>
        <button type="button" className={s.button} onClick={() => window.history.back()}>Back</button>
        <button type="button" className={s.button} onClick={() => window.history.forward()}>Forward</button>
      </footer>
    </aside>
  );
}
