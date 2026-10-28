/** A chip ([CAP-006: chip view](../../../../mbse-basis/docs/capabilities/CAP-006.md)): an object's label, its schema, its summary and up to three other properties. A chip of an object
 * is [FEA-005: inspector views](../../../../mbse-basis/docs/features/FEA-005.md)'s gesture target: a click or a tap inspects it. */

import { useEffect, useRef } from "react";
import type { EntryView, ObjectView } from "../data/views.js";
import { moment } from "./Byline.js";
import { Markdown } from "./Markdown.js";
import { type RelationAnchor, useNavigation } from "./navigation.js";
import * as s from "./styles.js";
import { abbreviate, full } from "./values.js";

function Properties({ properties }: { readonly properties: ReadonlyMap<string, unknown> }) {
  if (properties.size === 0) return null;
  return (
    <dl className={s.props}>
      {[...properties].map(([name, value]) => (
        <div key={name} style={{ display: "contents" }}>
          <dt>{name}</dt>
          <dd title={full(value)}>{abbreviate(value, 40)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Scrolls `ref` into view while `current` (auto scrolling). */
function useScrolled<T extends HTMLElement>(current: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (current) ref.current?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [current]);
  return ref;
}

/** An object's chip, inspected on a click (with an anchor, in a relation inspector, [CAP-023: relation inspector](../../../../mbse-basis/docs/capabilities/CAP-023.md)); scrolled into view when
 * it is the one inspected (auto scrolling). */
export function ObjectChip({ object, showSchema = true, anchor }: {
  readonly object: ObjectView; readonly showSchema?: boolean; readonly anchor?: RelationAnchor | undefined;
}) {
  const { place, inspect } = useNavigation();
  const current = place.inspect?.key === object.key;
  const ref = useScrolled<HTMLButtonElement>(current);
  return (
    <button
      ref={ref}
      type="button"
      className={s.chip}
      aria-current={current}
      data-key={object.key}
      onClick={() => inspect({ key: object.key, schema: object.schema, anchor })}
    >
      <div className={s.chipLabel} title={object.label}><Markdown text={object.label} inline /></div>
      {showSchema && object.schema !== undefined && <div className={s.chipSchema}>{object.schema}</div>}
      {object.summary !== "" && (
        <p className={s.chipSummary} title={object.summary}><Markdown text={object.summary} inline /></p>
      )}
      <Properties properties={object.properties} />
    </button>
  );
}

/** What names a linked object beside its ID, and whether that is prose: its own label; where it has none ([CAP-005: label and summary view](../../../../mbse-basis/docs/capabilities/CAP-005.md)'s
 * fallback, its schema's name and its ID), its summary, else its first text property (a comment's text), either prose;
 * else its schema's name. */
function nameOf(object: ObjectView): { readonly name: string; readonly prose: boolean } {
  const fallback = object.schema === undefined ? object.id : `${object.schema} ${object.id}`;
  if (object.label !== fallback) return { name: object.label, prose: false };
  const text = object.summary !== "" ? object.summary
    : [...object.properties.values()].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return text === undefined ? { name: object.schema ?? object.id, prose: false } : { name: text, prose: true };
}

/** A pill's header, where the object has a creation in its provenance ([CAP-020: provenance display](../../../../mbse-basis/docs/capabilities/CAP-020.md)): `{identity} @ {datestamp}`. */
function PillHeader({ object }: { readonly object: ObjectView }) {
  const created = object.provenance.created;
  if (created === undefined) return null;
  return (
    <span className={s.pillHeader} aria-label="provenance">
      {created.who} @ <time dateTime={created.when}>{moment(created.when)}</time>
    </span>
  );
}

/** An adjacency's preview ([CAP-019: adjacencies at the end of a detail](../../../../mbse-basis/docs/capabilities/CAP-019.md)): one chip per entry and linked object, in two columns: the entry's properties on
 * the left, where it has any; on the right, a pill of the linked object, inspected on a click: a header of who created
 * it and when, where its provenance says ([CAP-020: provenance display](../../../../mbse-basis/docs/capabilities/CAP-020.md)), then `ID : name`, wrapping where its name is prose. With an
 * anchor, the click opens a relation inspector ([CAP-023: relation inspector](../../../../mbse-basis/docs/capabilities/CAP-023.md)). */
export function AdjacentChip({ object, entry, anchor }: {
  readonly object: ObjectView; readonly entry: EntryView; readonly anchor?: RelationAnchor | undefined;
}) {
  const { place, inspect } = useNavigation();
  const current = place.inspect?.key === object.key;
  const ref = useScrolled<HTMLButtonElement>(current);
  const { name, prose } = nameOf(object);
  return (
    <div className={`${s.chip} ${s.adjacentChip}`} title={entry.label}>
      {entry.properties.size > 0 && <div className={s.adjacentEntry}><Properties properties={entry.properties} /></div>}
      <div className={s.adjacentObject}>
        <button ref={ref} type="button" className={s.pill} aria-current={current} data-key={object.key}
          title={object.label} onClick={() => inspect({ key: object.key, schema: object.schema, anchor })}>
          <PillHeader object={object} />
          <span className={prose ? `${s.pillBody} ${s.prose}` : s.pillBody}>
            <span className={s.pillKey}>{object.id}</span> : <Markdown text={name} inline />
          </span>
        </button>
      </div>
    </div>
  );
}

/** A relation entry's chip ([CAP-006: chip view](../../../../mbse-basis/docs/capabilities/CAP-006.md) of an entry): its relation and its properties. An entry is not an object, so it is
 * not inspected. */
export function EntryChip({ entry }: { readonly entry: EntryView }) {
  return (
    <div className={`${s.chip} ${s.entryChip}`} title={entry.label}>
      <div className={s.chipLabel}>{entry.relation}</div>
      <div className={s.chipSchema}>{entry.links.map((l) => l.link).join(" · ")}</div>
      <Properties properties={entry.properties} />
    </div>
  );
}

export function Failure({ error }: { readonly error: Error }) {
  return <p className={s.error} role="alert">{error.message}</p>;
}

export function Loading() {
  return <p className={s.loading} role="status">Loading…</p>;
}
