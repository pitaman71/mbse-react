/** The UI's behavior against the golden corpus, which holds a case for every view the UI asks of the WorkTracker seed:
 * the browsers (FEA-004) and the inspector (FEA-005). */

import { Client, Views } from "@mbse/rest/Services/Rest/Client";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  test("a section per schema; chips in frame order; every app schema's chips from the corpus", async () => {
    renderApp();
    const tasks = await screen.findByRole("region", { name: "work.Task" });
    await within(tasks).findByText("Install the schemas");
    expect(within(tasks).getAllByRole("listitem").map((li) => li.querySelector("div")!.textContent))
      .toEqual(["Install the schemas", "Seed the demo"]);
    const comments = screen.getByRole("region", { name: "work.Comment" });
    expect(await within(comments).findByText("work.Comment CMT-001")).toBeInTheDocument();
    expect(within(comments).getByText("Should chips show adjacencies?")).toBeInTheDocument();
    const projects = screen.getByRole("region", { name: "work.Project" });
    expect(await within(projects).findByText("Schema-driven visualization")).toBeInTheDocument();
    expect(within(projects).queryByRole("alert")).toBeNull();
  });
});

describe("the schema browser (CAP-009)", () => {
  test("only schemas with a description: the WorkTracker's element schemas, each with its objects' chips", async () => {
    renderApp();
    await userEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const goals = await screen.findByRole("region", { name: "work.Goal" });
    expect(within(goals).getByText(/A milestone of a schedule/)).toBeInTheDocument();
    expect(await within(goals).findByText("Demoable index site")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "work.GoalDirectory" })).toBeNull();
  });
});

describe("the relation browser (CAP-011)", () => {
  test("entries grouped by relation, each once, relations in the store's order", async () => {
    const s = service();
    const detail = await s.detail(Views.read(s.store, response("detail-goal").split("\n")[0]!).binds.get("x"));
    const grouped = byRelation(["work.HasGoal", "work.Plans"], [...detail.entries, ...detail.entries]);
    expect([...grouped].map(([r, e]) => [r, e.length])).toEqual([["work.HasGoal", 1], ["work.Plans", 2], ["work.InGoals", 1]]);
  });

  test("every relation's entries, from the detail view over each schema", async () => {
    renderApp();
    await userEvent.click(screen.getByRole("tab", { name: "Relations" }));
    const plans = await screen.findByRole("region", { name: "work.Plans" });
    expect(within(plans).getAllByText("Demoable index site").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Some views could not be read/)).toBeNull();
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
    expect(await within(inspector).findByRole("heading", { level: 2, name: "Install the schemas" })).toBeInTheDocument();
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
    // the schedule, through CAP-008 too; then to it, and its own detail
    const schedule = within(inspector).getByRole("region", { name: "schedule" });
    await waitFor(() => expect(within(schedule).queryByRole("status")).toBeNull());
    expect(within(schedule).queryByRole("alert")).toBeNull();
    await userEvent.click(within(schedule).getByText("MVP"));
    expect(parse(window.location.hash).inspect?.schema).toBe("work.Schedule");
    expect(await within(screen.getByRole("complementary", { name: "inspector" }))
      .findByRole("heading", { level: 2, name: "MVP" })).toBeInTheDocument();
    // back: the goal again
    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.addEventListener("popstate", resolve, { once: true }));
    });
    expect(await screen.findByRole("heading", { level: 2, name: "Demoable index site" })).toBeInTheDocument();
  });
});

describe("editing text as markdown (CAP-014)", () => {
  test("view, edit, save while the service commits, and view again with what it gave back", async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const gated = async (input: string, init?: RequestInit): Promise<Response> => {
      if (typeof init?.body === "string" && init.body.includes("\"update\"")) await held; // the edit, not the views
      return corpusFetch(input, init);
    };
    renderApp(new Service(new Client("http://corpus", gated)));
    await userEvent.click(await screen.findByText("Install the schemas"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    await within(inspector).findByRole("heading", { level: 2, name: "Install the schemas" });
    await userEvent.click(within(inspector).getByRole("button", { name: "Edit" }));
    const form = within(inspector).getByRole("form", { name: "edit" });
    const title = within(form).getByRole("textbox", { name: "title" });
    const description = within(form).getByRole("textbox", { name: "description" });
    expect(title).toHaveValue("Install the schemas");
    fireEvent.change(title, { target: { value: "Install the **schemas**" } });
    fireEvent.change(description, { target: { value: "Define them in a *module-scope* `install`." } });
    await userEvent.click(within(inspector).getByRole("button", { name: "Save" }));
    // save mode: nothing can be changed or closed, and Save shows busy
    expect(within(inspector).getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(title).toBeDisabled();
    expect(within(inspector).getByRole("button", { name: "Close the inspector" })).toBeDisabled();
    release();
    // view mode again, the text read as markdown
    const heading = await within(inspector).findByRole("heading", { level: 2, name: "Install the schemas" });
    expect(heading.querySelector("strong")).toHaveTextContent("schemas");
    expect(within(inspector).getByText("install", { selector: "code" })).toBeInTheDocument();
    expect(within(inspector).getByRole("button", { name: "Edit" })).toBeEnabled();
  });

  test("a click on a value opens the editor; Cancel discards and sends nothing", async () => {
    const sent: string[] = [];
    const watched = async (input: string, init?: RequestInit): Promise<Response> => {
      if (typeof init?.body === "string" && init.body.includes("\"update\"")) sent.push(init.body);
      return corpusFetch(input, init);
    };
    renderApp(new Service(new Client("http://corpus", watched)));
    await userEvent.click(await screen.findByText("Seed the demo"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    await userEvent.click(await within(inspector).findByText("Write a small project for the browsers to show."));
    const title = within(inspector).getByRole("textbox", { name: "title" });
    fireEvent.change(title, { target: { value: "changed" } });
    await userEvent.click(within(inspector).getByRole("button", { name: "Cancel" }));
    expect(within(inspector).queryByRole("form", { name: "edit" })).toBeNull();
    expect(within(inspector).getByRole("heading", { level: 2, name: "Seed the demo" })).toBeInTheDocument();
    expect(sent).toEqual([]);
  });
});

describe("booleans as checkboxes (CAP-022)", () => {
  test("a reply's resolves_thread: a checkbox read in view mode, written in edit mode", async () => {
    renderApp();
    await userEvent.click(await screen.findByText("work.Comment CMT-003"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    const shown = await within(inspector).findByRole("checkbox", { name: "resolves_thread" });
    expect(shown).toBeChecked();
    expect(shown).toBeDisabled();
    await userEvent.click(within(inspector).getByRole("button", { name: "Edit" }));
    const field = within(within(inspector).getByRole("form", { name: "edit" })).getByRole("checkbox", { name: "resolves_thread" });
    expect(field).toBeEnabled();
    await userEvent.click(field);
    expect(field).not.toBeChecked();
    await userEvent.click(within(inspector).getByRole("button", { name: "Cancel" }));
    expect(await within(inspector).findByRole("checkbox", { name: "resolves_thread" })).toBeChecked();
  });
});

describe("adjacencies at the end of a detail (CAP-019), and proposals (CAP-018)", () => {
  /** The inspector's adjacency sections, in order: every region of its body but its properties. */
  const sections = (inspector: HTMLElement): string[] =>
    within(inspector).getAllByRole("region").map((r) => r.getAttribute("aria-label") ?? "")
      .filter((name) => name !== "properties");

  test("a topic's detail ends with its threads, nothing nested under a chip; a thread's ends with its replies", async () => {
    renderApp();
    await userEvent.click(await screen.findByText("Logical view as chip"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    const comments = await within(inspector).findByRole("region", { name: "comments" });
    expect(sections(inspector).at(-1)).toBe("comments");
    expect(await within(comments).findByText("work.Comment CMT-001")).toBeInTheDocument();
    expect(within(comments).queryAllByRole("region")).toEqual([]);  // no list under a chip
    expect(within(inspector).queryByRole("button", { name: "Add to directory" })).toBeNull();
    await userEvent.click(within(comments).getByText("work.Comment CMT-001"));
    const thread = screen.getByRole("complementary", { name: "inspector" });
    const replies = await within(thread).findByRole("region", { name: "replies" });
    expect(sections(thread).at(-1)).toBe("replies");
    expect(await within(replies).findByText("work.Comment CMT-002")).toBeInTheDocument();
    expect(within(replies).getByText("work.Comment CMT-003")).toBeInTheDocument();
  });

  test("+ on a thread's replies proposes a reply, committed in one transaction", async () => {
    const sent: string[] = [];
    const watched = async (input: string, init?: RequestInit): Promise<Response> => {
      if (typeof init?.body === "string" && init.body.includes("\"upsert\"")) sent.push(init.body);
      return corpusFetch(input, init);
    };
    renderApp(new Service(new Client("http://corpus", watched)));
    await userEvent.click(await screen.findByText("work.Comment CMT-001"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    const replies = await within(inspector).findByRole("region", { name: "replies" });
    await userEvent.click(within(replies).getByRole("button", { name: "Add to replies" }));
    const form = within(replies).getByRole("form", { name: "new in replies" });
    fireEvent.change(within(form).getByRole("textbox", { name: "text" }), { target: { value: "Closing this." } });
    await userEvent.click(within(form).getByRole("checkbox", { name: "resolves_thread" }));
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(within(replies).queryByRole("form", { name: "new in replies" })).toBeNull());
    expect(sent).toHaveLength(1); // the corpus's propose-reply: answered, so the request was the one it holds
    expect(within(inspector).queryByRole("alert")).toBeNull();
  });
});

describe("provenance (CAP-020) and creation order (CAP-021)", () => {
  test("a comment's inspector, and each linked comment, show who created it and when", async () => {
    renderApp();
    await userEvent.click(await screen.findByText("Logical view as chip"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    const comments = await within(inspector).findByRole("region", { name: "comments" });
    await within(comments).findByText("work.Comment CMT-001");
    const [byline] = within(comments).getAllByLabelText("provenance");
    expect(byline).toHaveTextContent("created by unknown");
    expect(byline!.querySelector("time")).toHaveAttribute("dateTime", "2026-10-26T14:30:05Z");
    await userEvent.click(within(comments).getByText("work.Comment CMT-001"));
    const header = await within(screen.getByRole("complementary", { name: "inspector" }))
      .findByLabelText("provenance");
    expect(header).toHaveTextContent("created by unknown");
  });
});
