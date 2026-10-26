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
  test("the address bar carries the view alone", () => {
    expect(parse(format("relations"))).toBe("relations");
    expect(parse("#/objects?inspect=x")).toBe("objects");
    expect(parse("")).toBe("objects");
  });
});

describe("the object browser (CAP-010)", () => {
  test("a section per singleton, holding its directory's objects' chips in frame order; no directory's own chip",
    async () => {
      renderApp();
      const tasks = await screen.findByRole("region", { name: "work.Tasks" });
      await within(tasks).findByText("Install the schemas");
      expect(within(tasks).getAllByRole("listitem").map((li) => li.querySelector("div")!.textContent))
        .toEqual(["Install the schemas", "Seed the demo"]);
      const comments = screen.getByRole("region", { name: "work.Comments" });
      expect(await within(comments).findByText("work.Comment CMT-001")).toBeInTheDocument();
      expect(within(comments).getByText("Should chips show adjacencies?")).toBeInTheDocument();
      const projects = screen.getByRole("region", { name: "work.Projects" });
      expect(await within(projects).findByText("Schema-driven visualization")).toBeInTheDocument();
      expect(within(projects).queryByRole("alert")).toBeNull();
      for (const name of ["work.Task", "work.Project", "work.ProjectDirectory"]) {
        expect(screen.queryByRole("region", { name })).toBeNull();
      }
      expect(screen.queryByText("work.Projects", { selector: "[role=listitem] *" })).toBeNull();
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
    expect(window.history.length).toBe(length); // the inspector stays out of the browser's history
    expect(window.location.hash).toBe("#/objects");
    release();
    expect(await within(inspector).findByRole("heading", { level: 2, name: "Install the schemas" })).toBeInTheDocument();
    await userEvent.click(within(inspector).getByRole("button", { name: "Close the inspector" }));
    expect(screen.queryByRole("complementary", { name: "inspector" })).toBeNull();
  });

  test("the detail view, its label at the top, adjacencies through CAP-008, and the inspector's own history", async () => {
    renderApp();
    const length = window.history.length;
    await userEvent.click(await screen.findByText("Demoable index site"));
    const inspector = await screen.findByRole("complementary", { name: "inspector" });
    expect(within(inspector).getByRole("button", { name: "Back" })).toBeDisabled();
    expect(await within(inspector).findByRole("heading", { level: 2, name: "Demoable index site" })).toBeInTheDocument();
    expect(within(inspector).getByText("Browse and inspect the seeded project.")).toBeInTheDocument();
    // CAP-008, previewed (CAP-019): one chip per entry, its properties on the left and the linked object's pill,
    // `ID : label`, on the right; the object's summary waits for its detail
    const capabilities = within(inspector).getByRole("region", { name: "capabilities" });
    await waitFor(() => expect(within(capabilities).queryByRole("status")).toBeNull());
    const pill = within(capabilities).getByRole("button", { name: /: No-code index view$/ });
    expect(pill).toHaveTextContent(/^CAP-\d+ : No-code index view$/);
    const chip = within(pill.parentElement!.closest("[title]") as HTMLElement);
    expect(chip.getByText("2026-12-07")).toBeInTheDocument();
    expect(chip.getAllByRole("button")).toHaveLength(1);
    expect(within(capabilities).queryByText("The index site, from the schema alone.")).toBeNull();
    // the schedule, through CAP-008 too; then to it, and its own detail
    const schedule = within(inspector).getByRole("region", { name: "schedule" });
    await waitFor(() => expect(within(schedule).queryByRole("status")).toBeNull());
    expect(within(schedule).queryByRole("alert")).toBeNull();
    await userEvent.click(within(schedule).getByRole("button", { name: /: MVP$/ }));
    expect(await within(inspector).findByRole("heading", { level: 2, name: "MVP" })).toBeInTheDocument();
    expect(window.history.length).toBe(length);
    expect(window.location.hash).toBe("#/objects");
    // the inspector's Back: the goal again; its Forward: the schedule again
    expect(within(inspector).getByRole("button", { name: "Forward" })).toBeDisabled();
    await userEvent.click(within(inspector).getByRole("button", { name: "Back" }));
    expect(await within(inspector).findByRole("heading", { level: 2, name: "Demoable index site" })).toBeInTheDocument();
    await userEvent.click(within(inspector).getByRole("button", { name: "Forward" }));
    expect(await within(inspector).findByRole("heading", { level: 2, name: "MVP" })).toBeInTheDocument();
    // closing forgets the inspector's history
    await userEvent.click(within(inspector).getByRole("button", { name: "Close the inspector" }));
    await userEvent.click(await screen.findByText("Demoable index site"));
    const reopened = await screen.findByRole("complementary", { name: "inspector" });
    expect(within(reopened).getByRole("button", { name: "Back" })).toBeDisabled();
  });
});

describe("the ownership path as a breadcrumb", () => {
  test("an owned object's header shows its path; no ownership list; its singleton a click away", async () => {
    renderApp();
    await userEvent.click(await screen.findByText("Install the schemas"));
    const inspector = screen.getByRole("complementary", { name: "inspector" });
    await within(inspector).findByRole("heading", { level: 2, name: "Install the schemas" });
    const crumbs = within(inspector).getByRole("navigation", { name: "ownership" });
    expect(crumbs).toHaveTextContent("work.Tasks › TSK-001");
    expect(within(crumbs).getByText("TSK-001")).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(within(inspector).queryAllByRole("status")).toEqual([]));
    expect(within(inspector).queryByRole("region", { name: "directory" })).toBeNull();
    await userEvent.click(within(crumbs).getByRole("button", { name: "work.Tasks" }));
    const directory = screen.getByRole("complementary", { name: "inspector" });
    expect(await within(directory).findByRole("heading", { level: 2, name: "work.TaskDirectory work.Tasks" }))
      .toBeInTheDocument();
    expect(within(directory).queryByRole("navigation", { name: "ownership" })).toBeNull(); // a singleton: no path
    const tasks = await within(directory).findByRole("region", { name: "tasks" });
    expect(await within(tasks).findByRole("button", { name: /TSK-002 : Seed the demo$/ })).toBeInTheDocument();
    expect(within(directory).queryByRole("alert")).toBeNull();
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
    // a comment has no label of its own: its pill shows its text, as prose
    expect(await within(comments).findByRole("button", { name: /CMT-001 : Should chips show adjacencies\?$/ }))
      .toBeInTheDocument();
    expect(within(comments).queryAllByRole("region")).toEqual([]);  // no list under a chip
    expect(within(inspector).queryByRole("button", { name: "Add to directory" })).toBeNull();
    await userEvent.click(within(comments).getByRole("button", { name: /CMT-001 : / }));
    const thread = screen.getByRole("complementary", { name: "inspector" });
    const replies = await within(thread).findByRole("region", { name: "replies" });
    expect(sections(thread).at(-1)).toBe("replies");
    expect(await within(replies).findByRole("button", { name: /CMT-002 : Not by default: a chip stays small\. The inspector lists them\.$/ })).toBeInTheDocument();
    expect(within(replies).getByRole("button", { name: /CMT-003 : Agreed, no adjacencies on chips\.$/ })).toBeInTheDocument();
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
    // in the comment's pill, a header `{identity} @ {datestamp}` above `ID : text`; no byline outside the chip
    const pill = await within(comments).findByRole("button", { name: /CMT-001 : / });
    const header = within(pill).getByLabelText("provenance");
    expect(header).toHaveTextContent(/^unknown @ /);
    expect(header.querySelector("time")).toHaveAttribute("dateTime", "2026-10-26T14:30:05Z");
    expect(within(comments).getAllByLabelText("provenance").every((p) => p.closest("button") !== null)).toBe(true);
    await userEvent.click(within(comments).getByRole("button", { name: /CMT-001 : / }));
    const byline = await within(screen.getByRole("complementary", { name: "inspector" }))
      .findByLabelText("provenance");
    expect(byline).toHaveTextContent("created by unknown");
  });
});
