/** Value abbreviation ([mbse-basis/proposals/PRIORITIES.md, single-user demo](../../../../mbse-basis/proposals/PRIORITIES.md#single-user-demo-with-schema-driven-index-site-for-any-mbse-app)): a property's value as one short line, its full form kept for a
 * tooltip and for the inspector. */

const numbers = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });

/** A value in full: a string as it is, a number or bigint in the locale's digits, null as a dash. */
export function full(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : numbers.format(value);
  return String(value);
}

/** A value in at most `max` characters, cut at a word where it can be, ending with an ellipsis. */
export function abbreviate(value: unknown, max = 60): string {
  const text = full(value).replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max / 2 ? cut.slice(0, space) : cut}…`;
}
