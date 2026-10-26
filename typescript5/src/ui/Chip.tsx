/** A chip (CAP-006): an object's label, its schema, its summary and up to three other properties. A chip of an object
 * is FEA-005's gesture target: a click or a tap inspects it. */

import { useEffect, useRef } from "react";
import type { EntryView, ObjectView } from "../data/views.js";
import { Markdown } from "./Markdown.js";
import { useNavigation } from "./navigation.js";
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

/** An object's chip, inspected on a click; scrolled into view when it is the one inspected (auto scrolling). */
export function ObjectChip({ object, showSchema = true }: { readonly object: ObjectView; readonly showSchema?: boolean }) {
  const { place, inspect } = useNavigation();
  const current = place.inspect?.key === object.key;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (current) ref.current?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [current]);
  return (
    <button
      ref={ref}
      type="button"
      className={s.chip}
      aria-current={current}
      data-key={object.key}
      onClick={() => inspect({ key: object.key, schema: object.schema })}
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

/** A relation entry's chip (CAP-006 of an entry): its relation and its properties. An entry is not an object, so it is
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
