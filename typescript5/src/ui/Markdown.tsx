/** CAP-014: every `Schemas.OfStr` value is read as markdown. Inline, for one-line places (a label, a chip), paragraphs
 * are unwrapped and links shown as their text, so that a chip stays one button and a label one line. */

import ReactMarkdown from "react-markdown";
import { full } from "./values.js";

export function Markdown({ text, inline = false }: { readonly text: string; readonly inline?: boolean }) {
  return inline
    ? <ReactMarkdown disallowedElements={["p", "a"]} unwrapDisallowed>{text}</ReactMarkdown>
    : <ReactMarkdown>{text}</ReactMarkdown>;
}

/** A property's value: text as markdown, anything else in full. */
export function Value({ value, inline = false }: { readonly value: unknown; readonly inline?: boolean }) {
  return typeof value === "string" ? <Markdown text={value} inline={inline} /> : <>{full(value)}</>;
}
