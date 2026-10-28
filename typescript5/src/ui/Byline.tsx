/** [CAP-020: provenance display](../../../../mbse-basis/docs/capabilities/CAP-020.md): who created an object and when, and who last wrote it and when ([CAP-015: transaction provenance](../../../../mbse-basis/docs/capabilities/CAP-015.md)), in the browser's locale and
 * time zone. */

import type { ObjectView } from "../data/views.js";
import * as s from "./styles.js";

const moments = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** A UTC ISO 8601 moment in the browser's locale and time zone; the text as it is where it is not one. */
export function moment(when: string): string {
  const parsed = Date.parse(when);
  return Number.isNaN(parsed) ? when : moments.format(new Date(parsed));
}

/** The object's byline: "created by … · when", and, in full, "edited by … · when"; nothing where it has no history. */
export function Byline({ object, full = false }: { readonly object: ObjectView; readonly full?: boolean }) {
  const { created, modified } = object.provenance;
  if (created === undefined && modified === undefined) return null;
  return (
    <div className={s.byline} aria-label="provenance">
      {created !== undefined && (
        <span>created by <strong>{created.who}</strong> · <time dateTime={created.when}>{moment(created.when)}</time></span>
      )}
      {full && modified !== undefined && (
        <span>edited by <strong>{modified.who}</strong> · <time dateTime={modified.when}>{moment(modified.when)}</time></span>
      )}
    </div>
  );
}

/** [CAP-021: lists ordered by creation](../../../../mbse-basis/docs/capabilities/CAP-021.md): objects in the order they were created, where every one has a creation time; as given otherwise. */
export function byCreation<T extends { readonly object: ObjectView }>(items: readonly T[]): T[] {
  if (items.some((item) => item.object.provenance.created === undefined)) return [...items];
  return [...items].sort((a, b) => a.object.provenance.created!.when.localeCompare(b.object.provenance.created!.when));
}
