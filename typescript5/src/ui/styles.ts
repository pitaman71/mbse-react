/** The app's styles, in TypeScript (CSS-in-TS, Emotion's `css`): tokens as CSS custom properties, light and dark, and
 * the responsive layout (VISUALIZATION.md, Priorities: views fully responsive; auto scrolling on all views). */

import { css, injectGlobal } from "@emotion/css";

/** Below this width the inspector covers the browser instead of sitting beside it. */
export const NARROW = 900;

injectGlobal`
  :root {
    --bg: #f6f7f9; --surface: #ffffff; --text: #1d2330; --muted: #5b6475; --line: #dfe3ea;
    --accent: #2f5bd3; --accent-soft: #e6ecfb; --danger: #b3261e;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #12151b; --surface: #1b1f27; --text: #e6e9ef; --muted: #9aa3b3; --line: #2c323d;
      --accent: #8aa8ff; --accent-soft: #232c45; --danger: #f2a39d;
      color-scheme: dark;
    }
  }
  /* Font scaling: from 14px on a phone to 18px on a wide screen. */
  html { font-size: clamp(14px, 0.35vw + 12px, 18px); }
  html, body, #root { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.4; }
  * { box-sizing: border-box; }
`;

export const app = css({ display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", height: "100dvh" });

export const header = css({
  display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem 1rem", padding: "0.5rem 1rem",
  background: "var(--surface)", borderBottom: "1px solid var(--line)",
});
export const title = css({ fontSize: "1.1rem", fontWeight: 600, margin: 0 });
export const tabs = css({ display: "flex", gap: "0.25rem", flexWrap: "wrap" });
export const tab = css({
  border: "1px solid var(--line)", background: "transparent", color: "var(--text)", borderRadius: 999,
  padding: "0.25rem 0.8rem", font: "inherit", cursor: "pointer",
  "&[aria-selected=true]": { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--surface)" },
});
export const source = css({ marginLeft: "auto", color: "var(--muted)", fontSize: "0.8rem" });

/** The browser and the inspector: proportionate columns on a wide screen (3 : 2), the inspector over it on a narrow one. */
export const main = css({
  display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minHeight: 0,
  [`@media (min-width: ${NARROW}px)`]: { "&[data-inspector=open]": { gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" } },
});

/** Each view scrolls in its own region, so headers stay put (auto scrolling). */
export const scroller = css({ overflow: "auto", minHeight: 0, padding: "1rem", scrollBehavior: "smooth" });

export const section = css({
  background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, padding: "0.75rem 1rem",
  marginBottom: "1rem",
});
export const sectionTitle = css({ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 600 });
export const muted = css({ color: "var(--muted)", fontSize: "0.85rem", margin: "0 0 0.5rem" });
export const error = css({ color: "var(--danger)", fontSize: "0.85rem", margin: "0.25rem 0", overflowWrap: "anywhere" });

/** CAP-009's scrollable list of chips: one row, scrolled sideways. */
export const chipRow = css({
  display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(14rem, 18rem)", gap: "0.75rem",
  overflowX: "auto", paddingBottom: "0.5rem", scrollSnapType: "x proximity", "& > *": { scrollSnapAlign: "start" },
});
/** A grid of chips that reflows with the width. */
export const chipGrid = css({
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 16rem), 1fr))", gap: "0.75rem",
});

export const chip = css({
  display: "block", width: "100%", textAlign: "left", font: "inherit", color: "inherit",
  background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: "0.5rem 0.75rem",
  minWidth: 0,
  "button&": { cursor: "pointer", "&:hover, &:focus-visible": { borderColor: "var(--accent)", outline: "none" } },
  "&[aria-current=true]": { borderColor: "var(--accent)", background: "var(--accent-soft)" },
});
export const chipLabel = css({ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
export const chipSchema = css({ color: "var(--muted)", fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden",
  textOverflow: "ellipsis" });
export const chipSummary = css({
  fontSize: "0.85rem", margin: "0.25rem 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  overflow: "hidden",
});
export const props = css({
  display: "grid", gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr)", gap: "0.1rem 0.75rem", margin: 0,
  fontSize: "0.8rem", "& dt": { color: "var(--muted)" }, "& dd": { margin: 0, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap" },
});

/** CAP-011: an entry's chip aside its linked objects' chips. */
export const entryRow = css({
  display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 12rem), 1fr))",
});
export const entryChip = css({ background: "var(--accent-soft)" });

/** FEA-005: the inspector. Its label stays at the top and its actions at the bottom while the rest scrolls between. */
export const inspector = css({
  display: "grid", gridTemplateRows: "auto minmax(0, 1fr) auto", minHeight: 0, background: "var(--surface)",
  borderLeft: "1px solid var(--line)",
  [`@media (max-width: ${NARROW - 1}px)`]: { position: "fixed", inset: 0, zIndex: 10, borderLeft: "none" },
});
export const inspectorHead = css({
  display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.75rem 1rem",
  borderBottom: "1px solid var(--line)",
});
export const inspectorLabel = css({ margin: 0, fontSize: "1.2rem", fontWeight: 600, overflowWrap: "anywhere", flex: 1 });
export const inspectorActions = css({
  display: "flex", gap: "0.5rem", padding: "0.5rem 1rem", borderTop: "1px solid var(--line)",
});
export const button = css({
  border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", borderRadius: 6,
  padding: "0.25rem 0.75rem", font: "inherit", cursor: "pointer", "&:disabled": { opacity: 0.4, cursor: "default" },
});
export const detailProps = css(props, { fontSize: "0.9rem", "& dd": { whiteSpace: "normal", overflowWrap: "anywhere" } });
export const loading = css({ color: "var(--muted)", fontStyle: "italic" });

/** CAP-014: the inspector's editor, and a value that a click opens it on. */
export const editor = css({ display: "grid", gap: "0.75rem", "& label": { display: "grid", gap: "0.25rem" } });
export const editorName = css({ fontSize: "0.85rem", color: "var(--muted)" });
export const textarea = css({
  width: "100%", minHeight: "4.5rem", font: "inherit", padding: "0.5rem", borderRadius: 6, resize: "vertical",
  border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)",
  "&:focus-visible": { outline: "none", borderColor: "var(--accent)" }, "&:disabled": { opacity: 0.6 },
});
export const editable = css({
  cursor: "text", borderRadius: 4, "&:hover, &:focus-visible": { outline: "1px dashed var(--accent)", outlineOffset: 2 },
});
export const markdown = css({ "& > :first-child": { marginTop: 0 }, "& > :last-child": { marginBottom: 0 } });
export const checkboxField = css({
  display: "flex !important", alignItems: "center", gap: "0.5rem", "& input": { width: "1.1rem", height: "1.1rem" },
});

/** CAP-018 and CAP-019: a linked object with its own lists beneath it, "+", and a form's actions. */
export const linked = css({ display: "grid", gap: "0.35rem" });
export const nested = css({ marginLeft: "1rem", paddingLeft: "0.75rem", borderLeft: "2px solid var(--line)" });
export const nestedGrid = css({ display: "grid", gap: "0.5rem" });
export const addButton = css({
  marginLeft: "0.5rem", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--accent)",
  borderRadius: 999, width: "1.6rem", height: "1.6rem", lineHeight: 1, cursor: "pointer", font: "inherit",
  "&:hover, &:focus-visible": { borderColor: "var(--accent)", outline: "none" },
});
export const formActions = css({ display: "flex", gap: "0.5rem", justifyContent: "flex-end" });

/** CAP-020: an object's byline. */
export const byline = css({
  display: "flex", flexWrap: "wrap", gap: "0.25rem 0.75rem", fontSize: "0.8rem", color: "var(--muted)",
  "& strong": { fontWeight: 600, color: "var(--text)" },
});
