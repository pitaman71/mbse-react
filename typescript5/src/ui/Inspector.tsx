/** The object inspector (FEA-005): a shared panel that shows the detail view (CAP-007) of the object last inspected. Its
 * label stays at the top and its actions at the bottom, while the properties and adjacencies scroll between them; each
 * named adjacency lists its linked objects' chips (CAP-008). */

import { useEffect, useRef, useState } from "react";
import { adjacencies, type Adjacency, editableProperties, type Field } from "../data/schemas.js";
import type { AdjacentView, DetailView, EntryView, ObjectView } from "../data/views.js";
import { EntryChip, Failure, Loading, ObjectChip } from "./Chip.js";
import { useLoad } from "./load.js";
import { changes, type Draft, draftOf, Fields } from "./Fields.js";
import { Markdown, Value } from "./Markdown.js";
import { type Target, useNavigation } from "./navigation.js";
import { useService } from "./service.js";
import * as s from "./styles.js";

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

/** A value a click or a tap opens the editor on (CAP-014), where the object has text to edit. */
function Editable({ onEdit, children }: { readonly onEdit?: () => void; readonly children: React.ReactNode }) {
  if (onEdit === undefined) return <>{children}</>;
  return (
    <div className={s.editable} role="button" tabIndex={0} onClick={onEdit}
      onKeyDown={(e) => { if (e.key === "Enter") onEdit(); }}>
      {children}
    </div>
  );
}

function Detail({ target, detail, onEdit }: {
  readonly target: Target; readonly detail: DetailView; readonly onEdit?: () => void;
}) {
  const service = useService();
  const named = target.schema === undefined ? undefined : adjacencies(service.store, target.schema);
  return (
    <>
      {detail.object.summary !== "" && (
        <Editable onEdit={onEdit}><div className={s.markdown}><Markdown text={detail.object.summary} /></div></Editable>
      )}
      {detail.object.properties.size > 0 && (
        <section className={s.section} aria-label="properties">
          <dl className={s.detailProps}>
            {[...detail.object.properties].map(([name, value]) => (
              <div key={name} style={{ display: "contents" }}>
                <dt>{name}</dt>
                <dd><Editable onEdit={onEdit}><div className={s.markdown}><Value value={value} name={name} /></div></Editable></dd>
              </div>
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

/** The object's editor (CAP-014, CAP-022): a field per editable property of its schema, from what it holds. */
function Editor({ fields, draft, onChange, disabled, error }: {
  readonly fields: readonly Field[]; readonly draft: Draft;
  readonly onChange: (name: string, value: string | boolean) => void; readonly disabled: boolean; readonly error?: Error;
}) {
  return (
    <form className={s.editor} aria-label="edit" onSubmit={(e) => e.preventDefault()}>
      <Fields fields={fields} draft={draft} onChange={onChange} disabled={disabled} />
      {error !== undefined && <Failure error={error} />}
    </form>
  );
}

type Mode = "view" | "edit" | "save";

/** The panel: hidden until an object is inspected; each inspection clears it, shows loading, and fetches the detail.
 * Its text properties are edited in place (CAP-014): view mode, then edit mode on the Edit button or a click on a
 * value, then save mode while the service commits, and view mode again with what the service gives back. */
export function Inspector() {
  const { place, close } = useNavigation();
  const service = useService();
  const target = place.inspect;
  const body = useRef<HTMLDivElement>(null);
  const current = useRef(target?.key);
  current.current = target?.key;
  const loaded = useLoad(async () => {
    if (target === undefined) return undefined;
    await service.schemas();
    return service.detail(service.reference(target.key), target.schema);
  }, [service, target?.key, target?.schema]);
  const [edited, setEdited] = useState<DetailView | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<Draft>({});
  const [failed, setFailed] = useState<Error | undefined>(undefined);
  useEffect(() => {
    body.current?.scrollTo?.({ top: 0 });
    setEdited(undefined); setMode("view"); setDraft({}); setFailed(undefined);
  }, [target?.key]);
  if (target === undefined) return null;
  const detail = edited ?? (loaded.state === "done" ? loaded.value : undefined);
  const fields = detail !== undefined && target.schema !== undefined ? editableProperties(service.store, target.schema) : [];
  const edit = fields.length === 0 ? undefined : () => {
    setDraft(draftOf(fields, detail!.values));
    setFailed(undefined);
    setMode("edit");
  };
  const save = async (): Promise<void> => {
    if (detail === undefined) return;
    const changed = changes(fields, draft, detail.values);
    if (Object.keys(changed).length === 0) { setMode("view"); return; }
    const key = target.key;
    setMode("save");
    try {
      const saved = await service.edit(detail.object.reference, changed, target.schema);
      if (current.current !== key) return;
      setEdited(saved);
      setMode("view");
    } catch (error) {
      if (current.current !== key) return;
      setFailed(error instanceof Error ? error : new Error(String(error)));
      setMode("edit");
    }
  };
  const label = detail?.object.label;
  return (
    <aside className={s.inspector} aria-label="inspector">
      <header className={s.inspectorHead}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className={s.inspectorLabel}>
            {label !== undefined ? <Markdown text={label} inline />
              : loaded.state === "error" ? "Not available" : "Loading…"}
          </h2>
          {target.schema !== undefined && <div className={s.chipSchema}>{target.schema}</div>}
        </div>
        <button type="button" className={s.button} onClick={close} disabled={mode === "save"}
          aria-label="Close the inspector">✕</button>
      </header>
      <div ref={body} className={s.scroller} key={target.key}>
        {loaded.state === "loading" && edited === undefined && <Loading />}
        {loaded.state === "error" && edited === undefined && <Failure error={loaded.error} />}
        {detail !== undefined && (mode === "view"
          ? <Detail target={target} detail={detail} onEdit={edit} />
          : <Editor fields={fields} draft={draft} disabled={mode === "save"} error={failed}
            onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))} />)}
      </div>
      <footer className={s.inspectorActions}>
        {mode === "view" ? (
          <>
            <button type="button" className={s.button} onClick={() => window.history.back()}>Back</button>
            <button type="button" className={s.button} onClick={() => window.history.forward()}>Forward</button>
            {edit !== undefined && <button type="button" className={s.button} onClick={edit}>Edit</button>}
          </>
        ) : (
          <>
            <button type="button" className={s.button} onClick={() => setMode("view")} disabled={mode === "save"}>
              Cancel
            </button>
            <button type="button" className={s.button} onClick={() => { void save(); }} disabled={mode === "save"}
              aria-busy={mode === "save"}>
              {mode === "save" ? "Saving…" : "Save"}
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}
