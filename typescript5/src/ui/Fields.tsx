/** The fields an editor shows for properties (CAP-014, CAP-022): a text area for text, a checkbox for a boolean. Shared
 * by the object inspector (CAP-017) and the adjacency inspector (CAP-018). */

import type { Field } from "../data/schemas.js";
import * as s from "./styles.js";

/** A draft of edited values, by property name: text, or a boolean. */
export type Draft = Readonly<Record<string, string | boolean>>;

/** A draft starting from what `values` holds: absent text is empty, an absent boolean false. */
export function draftOf(fields: readonly Field[], values: ReadonlyMap<string, unknown>): Draft {
  return Object.fromEntries(fields.map((f) => [f.name, f.kind === "bool" ? values.get(f.name) === true
    : typeof values.get(f.name) === "string" ? values.get(f.name) as string : ""]));
}

/** What a draft changes of `values`, each property's new value: emptied text is `null`, which clears it. */
export function changes(fields: readonly Field[], draft: Draft, values: ReadonlyMap<string, unknown>):
    Record<string, unknown> {
  const before = draftOf(fields, values);
  return Object.fromEntries(fields.filter((f) => draft[f.name] !== before[f.name])
    .map((f) => [f.name, draft[f.name] === "" ? null : draft[f.name]]));
}

export function Fields({ fields, draft, onChange, disabled }: {
  readonly fields: readonly Field[]; readonly draft: Draft;
  readonly onChange: (name: string, value: string | boolean) => void; readonly disabled: boolean;
}) {
  return fields.map((f) => f.kind === "bool" ? (
    <label key={f.name} className={s.checkboxField}>
      <input type="checkbox" name={f.name} checked={draft[f.name] === true} disabled={disabled}
        onChange={(e) => onChange(f.name, e.target.checked)} />
      <span>{f.name}</span>
    </label>
  ) : (
    <label key={f.name}>
      <span className={s.editorName}>{f.name}</span>
      <textarea className={s.textarea} name={f.name} value={String(draft[f.name] ?? "")} disabled={disabled}
        onChange={(e) => onChange(f.name, e.target.value)} />
    </label>
  ));
}
