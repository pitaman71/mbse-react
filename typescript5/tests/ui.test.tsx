/** The UI's behavior against the golden corpus: the browsers (FEA-004) and the inspector (FEA-005). A view the corpus
 * holds no case for is refused (599), and the UI says so in its place. */

import { Client, Views } from "@mbse/rest/Services/Rest/Client";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { corpusFetch, response } from "../src/data/corpus.js";
import { Service } from "../src/data/views.js";
import { byRelation } from "../src/ui/Browsers.js";
import { App } from "../src/ui/App.js";
import { format, parse } from "../src/ui/navigation.js";

const service = (): Service => new Service(new Client("http://corpus", corpusFetch));

/** The key of the object a corpus case's first frame binds to `x`. */
async function keyIn(s: Service, caseName: string): Promise<string> {
  await s.schemas();
  return Views.keyOf(s.store, Views.read(s.store, response(caseName).split("\n")[0]!).binds.get("x"));
}

const renderApp = (s = service()) => render(<App service={s} source="golden corpus" />);

beforeEach(() => window.history.replaceState(null, "", "#/objects"));

describe("navigation", () => {
  test("the address bar carries the view and the inspected object", () => {
    const place = { view: "relations" as const, inspect: { key: "{\"path\": {}}", schema: "work.Goal" } };
    expect(parse(format(place))).toEqual(place);
    expect(parse("")).toEqual({ view: "objects", inspect: undefined });
  });
});

describe("the object browser (CAP-010)", () => {
  test("a section per schema; chips in frame order; a view the corpus lacks says so in its place", async () => {
    renderApp();
    const tasks = await screen.findByRole("region", { name: "work.Task" });
    await within(tasks).findByText("Install the schemas");
    expect(within(tasks).getAllByRole("listitem").map((li) => li.querySelector("div")!.textContent))
      .toEqual(["Install the schemas", "Seed the demo"]);
    const comments = screen.getByRole("region", { name: "work.Comment" });
    expect(await within(comments).findByText("work.Comment CMT-001")).toBeInTheDocument();
    expect(within(comments).getByText("Should chips show adjacencies?")).toBeInTheDocument();
    const projects = screen.getByRole("region", { name: "work.Project" });
    expect(await within(projects).findByRole("alert")).toHaveTextContent("golden corpus holds no case");
  });
});

describe("the schema browser (CAP-009)", () => {
  test("only schemas with a description: the WorkTracker declares none", async () => {
    renderApp();
    await userEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    expect(await screen.findByText(/none of this app's has a description/)).toBeInTheDocument();
  });
});

describe("the relation browser (CAP-011)", () => {
  test("entries grouped by relation, each once, relations in the store's order", async () => {
    const s = service();
    const detail = await s.detail(Views.read(s.store, response("detail-goal").split("\n")[0]!).binds.get("x"));
    const grouped = byRelation(["work.HasGoal", "work.Plans"], [...detail.entries, ...detail.entries]);
    expect([...grouped].map(([r, e]) => [r, e.length])).toEqual([["work.HasGoal", 1], ["work.Plans", 2], ["work.InGoals", 1]]);
  });

  test("the corpus holds no detail view over a schema, so each refusal is reported", async () => {
    renderApp();
    await userEvent.click(screen.getByRole("tab", { name: "Relations" }));
    expect(await screen.findByText(/Some views could not be read/)).toBeInTheDocument();
    expect(screen.getByText("No relation entries.")).toBeInTheDocument();
  });
});

describe("the inspector (FEA-005)", () => {
  test("hidden until a gesture; then revealed, loading, and the address bar pushed", async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const gated = async (input: string, init?: RequestInit): Promise<Response> => {
      if (input.endsWith("/views/detail")) await held;
      return corpusFetch(input, init);
    };
    renderApp(new Service(new Client("http://corpus", gated)));
    expect(screen.queryByRole("complementary", { name: "inspector" })).toBeNull();
    const length = window.history.length;
    await userEvent.click(await screen.findByText("Install the schemas"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    expect(within(inspector).getByRole("status")).toHaveTextContent("Loading");
    expect(window.history.length).toBe(length + 1);
    expect(parse(window.location.hash).inspect?.schema).toBe("work.Task");
    release();
    // the corpus holds no detail of a task
    expect(await within(inspector).findByRole("alert")).toHaveTextContent("golden corpus holds no case");
    await userEvent.click(within(inspector).getByRole("button", { name: "Close the inspector" }));
    expect(screen.queryByRole("complementary", { name: "inspector" })).toBeNull();
  });

  test("the detail view, its label at the top, adjacencies through CAP-008, and navigation with history", async () => {
    const s = service();
    const key = await keyIn(s, "detail-goal");
    window.history.replaceState(null, "", format({ view: "objects", inspect: { key, schema: "work.Goal" } }));
    renderApp(s);
    const inspector = await screen.findByRole("complementary", { name: "inspector" });
    expect(await within(inspector).findByRole("heading", { level: 2, name: "Demoable index site" })).toBeInTheDocument();
    expect(within(inspector).getByText("Browse and inspect the seeded project.")).toBeInTheDocument();
    // CAP-008: the capabilities' chips and their entries' properties, from the corpus's adjacency view
    const capabilities = within(inspector).getByRole("region", { name: "capabilities" });
    await waitFor(() => expect(within(capabilities).queryByRole("status")).toBeNull());
    expect(within(capabilities).getByText("No-code index view")).toBeInTheDocument();
    expect(within(capabilities).getByText("The index site, from the schema alone.")).toBeInTheDocument();
    expect(within(capabilities).getByText("2026-12-07")).toBeInTheDocument();
    // the corpus holds no adjacency view of the schedule: the detail view's own entry is shown, and the refusal
    const schedule = within(inspector).getByRole("region", { name: "schedule" });
    expect(await within(schedule).findByRole("alert")).toBeInTheDocument();
    await userEvent.click(within(schedule).getByText("MVP"));
    expect(parse(window.location.hash).inspect?.schema).toBe("work.Schedule");
    expect(await within(screen.getByRole("complementary", { name: "inspector" })).findByRole("alert"))
      .toHaveTextContent("golden corpus holds no case");
    // back: the goal again
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
    });
    expect(await screen.findByRole("heading", { level: 2, name: "Demoable index site" })).toBeInTheDocument();
  });
});
