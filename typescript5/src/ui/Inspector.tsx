/** The object inspector (FEA-005): a shared panel that shows the detail view (CAP-007) of the object last inspected. Its
 * label stays at the top and its actions at the bottom, while the properties and adjacencies scroll between them; each
 * named adjacency lists its linked objects' chips (CAP-008). */

import { useEffect, useRef, useState } from "react";
import { adjacencies, type Adjacency, editableProperties, type Field } from "../data/schemas.js";
import { type AdjacentView, type DetailView, type EntryView, type ObjectView, ownership } from "../data/views.js";
import { Byline, byCreation } from "./Byline.js";
import { AdjacentChip, Failure, Loading } from "./Chip.js";
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

/** What a save changed: every view is read again (`version`), and `changed` is called to say so. */
interface Refresh {
  readonly version: number;
  readonly changed: () => void;
}

/** CAP-018: a new object proposed through an adjacency: a field for each editable property of its schema (picked where
 * several fill the link) and of the relation's entries; Save commits the object and its entry in one transaction. */
function Proposer({ reference, adjacency, refresh, onDone }: {
  readonly reference: unknown; readonly adjacency: Adjacency; readonly refresh: Refresh; readonly onDone: () => void;
}) {
  const service = useService();
  const [schema, setSchema] = useState(adjacency.linked[0] ?? "");
  const [draft, setDraft] = useState<Draft>({});
  const [entryDraft, setEntryDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<Error | undefined>(undefined);
  const fields = editableProperties(service.store, schema);
  const entryFields = editableProperties(service.store, adjacency.relation);
  const none: ReadonlyMap<string, unknown> = new Map();
  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await service.propose(reference, adjacency.name, adjacency.link!, schema,
        changes(fields, draft, none), changes(entryFields, entryDraft, none));
      onDone();
      refresh.changed();
    } catch (error) {
      setFailed(error instanceof Error ? error : new Error(String(error)));
      setSaving(false);
    }
  };
  return (
    <form className={s.editor} aria-label={`new in ${adjacency.name}`} onSubmit={(e) => e.preventDefault()}>
      {adjacency.linked.length > 1 && (
        <label>
          <span className={s.editorName}>schema</span>
          <select value={schema} disabled={saving} onChange={(e) => { setSchema(e.target.value); setDraft({}); }}>
            {adjacency.linked.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      )}
      <Fields fields={fields} draft={draft} disabled={saving}
        onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))} />
      {entryFields.length > 0 && <span className={s.editorName}>{adjacency.relation}</span>}
      <Fields fields={entryFields} draft={entryDraft} disabled={saving}
        onChange={(name, value) => setEntryDraft((d) => ({ ...d, [name]: value }))} />
      {failed !== undefined && <Failure error={failed} />}
      <div className={s.formActions}>
        <button type="button" className={s.button} onClick={onDone} disabled={saving}>Cancel</button>
        <button type="button" className={s.button} onClick={() => { void save(); }} disabled={saving} aria-busy={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

/** CAP-008 for one named adjacency, in the inspected object's detail (CAP-019): one request for each schema its
 * entries may link, the results together, each linked object a chip. Until they arrive, or where every one is refused,
 * the detail view's own entries are shown, labelled from it. "+" proposes a new linked object (CAP-018). */
function AdjacencyList({ reference, adjacency, entries, refresh }: {
  readonly reference: unknown; readonly adjacency: Adjacency; readonly entries: readonly EntryView[];
  readonly refresh: Refresh;
}) {
  const service = useService();
  const [proposing, setProposing] = useState(false);
  const loaded = useLoad(async () => {
    const settled = await Promise.allSettled(adjacency.linked.map((y) => service.adjacency(reference, adjacency.name, y)));
    const views: AdjacentView[] = [];
    const errors: Error[] = [];
    for (const r of settled) {
      if (r.status === "fulfilled") views.push(...r.value);
      else errors.push(r.reason instanceof Error ? r.reason : new Error(String(r.reason)));
    }
    return { views, errors, all: errors.length === settled.length };
  }, [service, reference, adjacency.name, adjacency.linked.join(" "), refresh.version]);
  const fallback = entries.flatMap((entry) => others(entry, adjacency.me).map((object) => ({ object, entry })));
  const shown = byCreation(loaded.state === "done" && !loaded.value.all ? loaded.value.views : fallback);
  return (
    <section className={s.section} aria-label={adjacency.name}>
      <h3 className={s.sectionTitle} title={adjacency.relation}>
        {adjacency.name} <span className={s.chipSchema}>({shown.length})</span>
        {adjacency.link !== undefined && adjacency.linked.length > 0 && !adjacency.owner && !proposing && (
          <button type="button" className={s.addButton} onClick={() => setProposing(true)}
            aria-label={`Add to ${adjacency.name}`}>+</button>
        )}
      </h3>
      {proposing && <Proposer reference={reference} adjacency={adjacency} refresh={refresh}
        onDone={() => setProposing(false)} />}
      <div className={s.chipGrid}>
        {shown.map(({ object, entry }) => <AdjacentChip key={`${entry.key} ${object.key}`} object={object} entry={entry} />)}
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
          .map((l) => <AdjacentChip key={`${entry.key} ${l.link}`} object={l.object} entry={entry} />))}
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

/** The inspected object's ownership path, as a breadcrumb (FEA-003's identity): its singleton, then each owning entry's
 * key, itself last; each ancestor inspected on a click. It stands in for the ownership adjacency's list (CAP-019). */
function Breadcrumb({ target }: { readonly target: Target }) {
  const service = useService();
  const { inspect } = useNavigation();
  const crumbs = ownership(service.store, target.key);
  if (crumbs.length < 2) return null;
  return (
    <nav className={s.breadcrumb} aria-label="ownership">
      {crumbs.map((crumb, i) => (
        <span key={crumb.key}>
          {i > 0 && <span aria-hidden="true"> › </span>}
          {i === crumbs.length - 1 ? <span aria-current="page">{crumb.name}</span>
            : <button type="button" className={s.crumb}
              onClick={() => inspect({ key: crumb.key, schema: crumb.schema })}>{crumb.name}</button>}
        </span>
      ))}
    </nav>
  );
}

function Detail({ target, detail, onEdit, refresh }: {
  readonly target: Target; readonly detail: DetailView; readonly onEdit?: () => void; readonly refresh: Refresh;
}) {
  const service = useService();
  // the ownership adjacency is the breadcrumb's (Breadcrumb), not a list
  const named = target.schema === undefined ? undefined
    : adjacencies(service.store, target.schema).filter((a) => !a.owner);
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
        return <AdjacencyList key={adjacency.name} reference={detail.object.reference} adjacency={adjacency}
          entries={entries} refresh={refresh} />;
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
  const [version, setVersion] = useState(0); // bumped by a save, so that every view is read again
  const loaded = useLoad(async () => {
    if (target === undefined) return undefined;
    await service.schemas();
    return service.detail(service.reference(target.key), target.schema);
  }, [service, target?.key, target?.schema, version]);
  const [edited, setEdited] = useState<DetailView | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<Draft>({});
  const [failed, setFailed] = useState<Error | undefined>(undefined);
  const refresh: Refresh = { version, changed: () => { setEdited(undefined); setVersion((v) => v + 1); } };
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
          <h2 className={s.inspectorLabel} title={target.schema}>
            {label !== undefined ? <Markdown text={label} inline />
              : loaded.state === "error" ? "Not available" : "Loading…"}
          </h2>
          <Breadcrumb target={target} />
          {detail !== undefined && <Byline object={detail.object} full />}
        </div>
        <button type="button" className={s.button} onClick={close} disabled={mode === "save"}
          aria-label="Close the inspector">✕</button>
      </header>
      <div ref={body} className={s.scroller} key={target.key}>
        {loaded.state === "loading" && edited === undefined && <Loading />}
        {loaded.state === "error" && edited === undefined && <Failure error={loaded.error} />}
        {detail !== undefined && (mode === "view"
          ? <Detail target={target} detail={detail} onEdit={edit} refresh={refresh} />
          : <Editor fields={fields} draft={draft} disabled={mode === "save"} error={failed}
            onChange={(name, value) => setDraft((d) => ({ ...d, [name]: value }))} />)}
      </div>
      {(mode !== "view" || edit !== undefined) && <footer className={s.inspectorActions}>
        {mode === "view" ? (
          <button type="button" className={s.button} onClick={edit}>Edit</button>
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
      </footer>}
    </aside>
  );
}
