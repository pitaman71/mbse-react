/** The data layer against the golden corpus: which schemas the browsers show, adjacencies, and the views shaped. */

import { Builders } from "@mbse/schemas/Framework";
import { Client } from "@mbse/rest/Services/Rest/Client";
import { describe, expect, test } from "vitest";
import { corpusFetch, NO_CASE } from "../src/data/corpus.js";
import { adjacencies, appObjectSchemas, browsableSchemas, schemaOfLink, schemasOfLink } from "../src/data/schemas.js";
import { Service } from "../src/data/views.js";

const service = (): Service => new Service(new Client("http://corpus", corpusFetch));

describe("the corpus fetch", () => {
  test("answers a case it holds, and 599 for one it does not", async () => {
    expect((await corpusFetch("http://corpus/views")).status).toBe(200);
    expect((await corpusFetch("http://corpus/nothing")).status).toBe(NO_CASE);
  });
});

describe("schemas", () => {
  test("the app's reference object schemas: no framework schema, no relation", async () => {
    const s = service();
    await s.schemas();
    const names = appObjectSchemas(s.store);
    expect(names.slice(0, 8)).toEqual(["work.Project", "work.Feature", "work.Capability", "work.Result", "work.Task",
      "work.Comment", "work.Schedule", "work.Goal"]);
    expect(names).toContain("work.GoalDirectory");
    expect(names).not.toContain("work.Plans");
    expect(names.some((n) => n.startsWith("Schemas."))).toBe(false);
  });

  test("CAP-009: the WorkTracker declares no schema description, so none is browsable", async () => {
    const s = service();
    await s.schemas();
    expect(browsableSchemas(s.store)).toEqual([]);
  });

  test("CAP-009: a schema with a name and a description is browsable; one without, or a value object, is not", () => {
    const store: any = new Builders.Store();
    store.transaction((txn: any) => {
      const S = txn.Schemas;
      return txn.uid("test/1").mutations([(mu: any) => mu.upsert((u: any) => u.exists([(p: any) => p
        .symbols({ Described: S.OfObject, Bare: S.OfObject, Value: S.OfObject })
        .spec([
          (_: any) => _.Described.name("t.Described").description("Has one").ref(true).properties({ name: S.OfStr }),
          (_: any) => _.Bare.name("t.Bare").ref(true).properties({ name: S.OfStr }),
          (_: any) => _.Value.name("t.Value").description("A value object").properties({ n: S.OfInt }),
        ])]))]);
    });
    expect(browsableSchemas(store)).toEqual(["t.Described"]);
  });

  test("adjacencies and the schemas their links fill", async () => {
    const s = service();
    await s.schemas();
    expect(adjacencies(s.store, "work.Goal").map((a) => [a.name, a.relation, a.linked])).toEqual([
      ["directory", "work.InGoals", ["work.GoalDirectory"]],
      ["schedule", "work.HasGoal", ["work.Schedule"]],
      ["capabilities", "work.Plans", ["work.Capability"]],
    ]);
    expect(schemaOfLink(s.store, "work.Plans", "goal")).toBe("work.Goal");
    expect(schemasOfLink(s.store, "work.About", "topic").length).toBeGreaterThan(1);
    expect(schemaOfLink(s.store, "work.About", "topic")).toBeUndefined();
  });
});

describe("views", () => {
  test("CAP-006: chips, in frame order, with CAP-005's fallback label", async () => {
    const s = service();
    expect((await s.chips("work.Task")).map((o) => o.label)).toEqual(["Install the schemas", "Seed the demo"]);
    const [comment] = await s.chips("work.Comment");
    expect(comment!.label).toBe("work.Comment CMT-001");
    expect(comment!.summary).toBe("");
    expect([...comment!.properties]).toEqual([["text", "Should chips show adjacencies?"], ["resolved", false]]);
  });

  test("a view the corpus does not hold is refused", async () => {
    await expect(service().chips("work.Project")).rejects.toMatchObject({ status: NO_CASE });
  });
});

describe("detail and adjacency", () => {
  const goal = async (s: Service): Promise<unknown> => {
    const { Views } = await import("@mbse/rest/Services/Rest/Client");
    const { response } = await import("../src/data/corpus.js");
    await s.schemas();
    return Views.read(s.store, response("detail-goal").split("\n")[0]!).binds.get("x");
  };

  test("CAP-007: every property, and each entry with its linked objects' labels and schemas", async () => {
    const s = service();
    const detail = await s.detail(await goal(s), "work.Goal");
    expect(detail.object.label).toBe("Demoable index site");
    expect(detail.object.summary).toBe("Browse and inspect the seeded project.");
    expect(detail.object.properties.size).toBe(0); // title and description are its label and summary
    expect(detail.entries.map((e) => e.label)).toEqual([
      "work.InGoals: Demoable index site, work.Goals",
      "work.HasGoal: Demoable index site, MVP",
      "work.Plans: Demoable index site, No-code index view",
      "work.Plans: Demoable index site, Logical view as chip",
    ]);
    const plans = detail.entries[2]!;
    expect(plans.links.map((l) => [l.link, l.object.schema, l.object.label])).toEqual([
      ["goal", "work.Goal", "Demoable index site"], ["capability", "work.Capability", "No-code index view"]]);
    expect([...plans.properties.keys()]).toContain("progress");
  });

  test("CAP-008: each linked object's chip and the entry linking it", async () => {
    const s = service();
    const linked = await s.adjacency(await goal(s), "capabilities", "work.Capability");
    expect(linked.map((l) => l.object.label)).toEqual(["No-code index view", "Logical view as chip"]);
    expect([...linked[0]!.entry.properties]).toEqual([["original", "2026-11-30"], ["forecast", "2026-12-07"],
      ["progress", 0.25]]);
  });
});
