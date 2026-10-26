/** The index site's browser views (FEA-004): schemas (CAP-009), objects (CAP-010) and relation entries (CAP-011), each a
 * large scrollable view of sections of chips (CAP-006): a schema's extent, or the objects a directory holds (CAP-008),
 * each loaded whole and shown in frame order; counted objects never arrive (the service leaves them out, FEA-003). */

import { adjacencies, appObjectSchemas, appRelations, browsableSchemas, description, singleton, singletonSchemas }
  from "../data/schemas.js";
import { type EntryView, type ObjectView, ownership } from "../data/views.js";
import { EntryChip, Failure, Loading, ObjectChip } from "./Chip.js";
import { useLoad } from "./load.js";
import type { RelationAnchor } from "./navigation.js";
import { useService } from "./service.js";
import * as s from "./styles.js";

/** CAP-023: where an object of `schema` is owned, the anchor of its ownership relation: the link the object fills, and
 * the other bound to its owner, the last step before it on its ownership path. None for a singleton. */
function ownedAnchor(store: any, schema: string, object: ObjectView): RelationAnchor | undefined {
  const own = adjacencies(store, schema).find((a) => a.owner);
  const path = ownership(store, object.key);
  const owner = path[path.length - 2];
  return own === undefined || own.link === undefined || owner === undefined ? undefined
    : { relation: own.relation, link: own.me, links: { [own.link]: { key: owner.key, schema: owner.schema } },
      properties: {} };
}

/** The chips of one schema's extent, as a row (CAP-009); each owned object's opens a relation inspector anchored at
 * its ownership relation (CAP-023), so that its arrows step along its owner's objects. */
function Extent({ schema }: { readonly schema: string }) {
  const service = useService();
  const chips = useLoad(() => service.chips(schema), [service, schema]);
  if (chips.state === "loading") return <Loading />;
  if (chips.state === "error") return <Failure error={chips.error} />;
  if (chips.value.length === 0) return <p className={s.muted}>No objects.</p>;
  return (
    <div className={s.chipRow} role="list">
      {chips.value.map((object) => (
        <div role="listitem" key={object.key}>
          <ObjectChip object={object} showSchema={false} anchor={ownedAnchor(service.store, schema, object)} />
        </div>
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
            <Extent schema={name} />
          </section>
        ));
      }}
    </WithSchemas>
  );
}

/** The objects a directory's singleton holds: CAP-008 over each of its named adjacencies but its ownership one, for
 * each schema the adjacency links, each object once, in frame order. */
async function held(service: ReturnType<typeof useService>, directory: string): Promise<ObjectView[]> {
  const [root] = await service.chips(directory);
  if (root === undefined) return [];
  const views = await Promise.all(adjacencies(service.store, directory).filter((a) => !a.owner)
    .flatMap((a) => a.linked.map((linked) => service.adjacency(root.reference, a.name, linked))));
  const objects = new Map<string, ObjectView>();
  for (const { object } of views.flat()) if (!objects.has(object.key)) objects.set(object.key, object);
  return [...objects.values()];
}

/** The chips of the objects a directory's singleton holds, as a row (CAP-010). */
function Held({ directory }: { readonly directory: string }) {
  const service = useService();
  const chips = useLoad(() => held(service, directory), [service, directory]);
  if (chips.state === "loading") return <Loading />;
  if (chips.state === "error") return <Failure error={chips.error} />;
  if (chips.value.length === 0) return <p className={s.muted}>No objects.</p>;
  return (
    <div className={s.chipRow} role="list">
      {chips.value.map((object) => (
        <div role="listitem" key={object.key}><ObjectChip object={object} showSchema={false} /></div>
      ))}
    </div>
  );
}

/** CAP-010: a section per schema that names a singleton, in the store's order, headed by the singleton's name; in
 * each, the chips of the objects the singleton holds. */
export function ObjectBrowser() {
  return (
    <WithSchemas>
      {(store) => singletonSchemas(store).map((name) => (
        <section key={name} className={s.section} aria-label={singleton(store, name)}>
          <h2 className={s.sectionTitle}>{singleton(store, name)}</h2>
          <Held directory={name} />
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
              <div className={`${s.chipRow} ${s.entryRow}`}>
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
