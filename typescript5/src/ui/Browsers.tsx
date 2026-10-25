/** The index site's browser views (FEA-004): schemas (CAP-009), objects (CAP-010) and relation entries (CAP-011), each a
 * large scrollable view of sections, populated from the chip view (CAP-006). Each schema's extent is loaded whole and
 * shown in frame order; counted objects never arrive (the service leaves them out, FEA-003). */

import { appObjectSchemas, appRelations, browsableSchemas, description } from "../data/schemas.js";
import type { EntryView, ObjectView } from "../data/views.js";
import { EntryChip, Failure, Loading, ObjectChip } from "./Chip.js";
import { useLoad } from "./load.js";
import { useService } from "./service.js";
import * as s from "./styles.js";

/** The chips of one schema's extent, as a row (CAP-009) or a grid (CAP-010). */
function Extent({ schema, layout }: { readonly schema: string; readonly layout: "row" | "grid" }) {
  const service = useService();
  const chips = useLoad(() => service.chips(schema), [service, schema]);
  if (chips.state === "loading") return <Loading />;
  if (chips.state === "error") return <Failure error={chips.error} />;
  if (chips.value.length === 0) return <p className={s.muted}>No objects.</p>;
  return (
    <div className={layout === "row" ? s.chipRow : s.chipGrid} role="list">
      {chips.value.map((object) => (
        <div role="listitem" key={object.key}><ObjectChip object={object} showSchema={false} /></div>
      ))}
    </div>
  );
}

/** Waits for the schemas (CAP-002), then renders. */
function WithSchemas({ children }: { readonly children: (store: any) => React.ReactNode }) {
  const service = useService();
  const loaded = useLoad(() => service.schemas(), [service]);
  if (loaded.state === "loading") return <Loading />;
  if (loaded.state === "error") return <Failure error={loaded.error} />;
  return <>{children(service.store)}</>;
}

/** CAP-009: a section per schema with a registered name and a description, the app's reference object schemas only;
 * in each, the schema's label (its name) and description, then a scrollable row of its objects' chips. */
export function SchemaBrowser() {
  return (
    <WithSchemas>
      {(store) => {
        const names = browsableSchemas(store);
        if (names.length === 0) {
          return (
            <p className={s.muted}>
              No schema to show: the schema browser shows the app's reference object schemas that have a registered name
              and a description (CAP-009), and none of this app's has a description.
            </p>
          );
        }
        return names.map((name) => (
          <section key={name} className={s.section} aria-label={name}>
            <h2 className={s.sectionTitle}>{name}</h2>
            <p className={s.muted}>{description(store, name)}</p>
            <Extent schema={name} layout="row" />
          </section>
        ));
      }}
    </WithSchemas>
  );
}

/** CAP-010: a section per extant object, from its chip, grouped by schema in the store's order. */
export function ObjectBrowser() {
  return (
    <WithSchemas>
      {(store) => appObjectSchemas(store).map((name) => (
        <section key={name} className={s.section} aria-label={name}>
          <h2 className={s.sectionTitle}>{name}</h2>
          <Extent schema={name} layout="grid" />
        </section>
      ))}
    </WithSchemas>
  );
}

/** Entries by relation, each once, in the order met; relations in the store's order. */
export function byRelation(relations: readonly string[], entries: readonly EntryView[]): Map<string, EntryView[]> {
  const grouped = new Map<string, EntryView[]>(relations.map((r) => [r, []]));
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    if (!grouped.has(entry.relation)) grouped.set(entry.relation, []);
    grouped.get(entry.relation)!.push(entry);
  }
  return grouped;
}

interface Relations {
  readonly grouped: Map<string, EntryView[]>;
  readonly chips: ReadonlyMap<string, ObjectView>;
  readonly failures: readonly { readonly schema: string; readonly error: Error }[];
}

/** CAP-011: the entries every object's named adjacencies hold (CAP-007 with `x` given each schema), and every object's
 * chip (CAP-006), so that each entry shows aside its linked objects' chips. A schema whose views fail is reported and
 * the rest still shown. */
async function relations(service: ReturnType<typeof useService>): Promise<Relations> {
  await service.schemas();
  const schemas = appObjectSchemas(service.store);
  const failures: { schema: string; error: Error }[] = [];
  const settle = async <T,>(schema: string, p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p;
    } catch (error) {
      failures.push({ schema, error: error instanceof Error ? error : new Error(String(error)) });
      return [];
    }
  };
  const [entries, chips] = await Promise.all([
    Promise.all(schemas.map((schema) => settle(schema, service.entries(schema)))),
    Promise.all(schemas.map((schema) => settle(schema, service.chips(schema)))),
  ]);
  return {
    grouped: byRelation(appRelations(service.store), entries.flat()),
    chips: new Map(chips.flat().map((chip) => [chip.key, chip])),
    failures,
  };
}

export function RelationBrowser() {
  const service = useService();
  const loaded = useLoad(() => relations(service), [service]);
  if (loaded.state === "loading") return <Loading />;
  if (loaded.state === "error") return <Failure error={loaded.error} />;
  const { grouped, chips, failures } = loaded.value;
  const shown = [...grouped].filter(([, entries]) => entries.length > 0);
  return (
    <>
      {failures.length > 0 && (
        <details className={s.section}>
          <summary className={s.error}>Some views could not be read ({failures.length})</summary>
          {failures.map((f, i) => <p key={i} className={s.error}>{f.schema}: {f.error.message}</p>)}
        </details>
      )}
      {shown.length === 0 && <p className={s.muted}>No relation entries.</p>}
      {shown.map(([relation, entries]) => (
        <section key={relation} className={s.section} aria-label={relation}>
          <h2 className={s.sectionTitle}>{relation}</h2>
          {description(service.store, relation) !== "" && <p className={s.muted}>{description(service.store, relation)}</p>}
          {entries.map((entry) => (
            <section key={entry.key} className={s.section} aria-label={entry.label}>
              <div className={s.entryRow}>
                <EntryChip entry={entry} />
                {entry.links.map(({ link, object }) => (
                  <ObjectChip key={link} object={chips.get(object.key) ?? object} />
                ))}
              </div>
            </section>
          ))}
        </section>
      ))}
    </>
  );
}
