/** The index site (FEA-001, CAP-001): the browsers (FEA-004) and the inspector (FEA-005), driven by the schema alone. */

import { ObjectBrowser, RelationBrowser, SchemaBrowser } from "./Browsers.js";
import { Inspector } from "./Inspector.js";
import { NavigationProvider, useNavigation, VIEWS, type View } from "./navigation.js";
import { ServiceContext } from "./service.js";
import * as s from "./styles.js";
import type { Service } from "../data/views.js";

const TITLES: Record<View, string> = { schemas: "Schemas", objects: "Objects", relations: "Relations" };

function Layout({ source }: { readonly source: string }) {
  const { place, show } = useNavigation();
  return (
    <div className={s.app}>
      <header className={s.header}>
        <h1 className={s.title}>Index</h1>
        <nav className={s.tabs} role="tablist" aria-label="Views">
          {VIEWS.map((view) => (
            <button key={view} type="button" role="tab" className={s.tab} aria-selected={place.view === view}
              onClick={() => show(view)}>{TITLES[view]}</button>
          ))}
        </nav>
        <span className={s.source}>{source}</span>
      </header>
      <div className={s.main} data-inspector={place.inspect === undefined ? "closed" : "open"}>
        <main className={s.scroller} role="tabpanel" aria-label={TITLES[place.view]}>
          {place.view === "schemas" && <SchemaBrowser />}
          {place.view === "objects" && <ObjectBrowser />}
          {place.view === "relations" && <RelationBrowser />}
        </main>
        <Inspector />
      </div>
    </div>
  );
}

export function App({ service, source }: { readonly service: Service; readonly source: string }) {
  return (
    <ServiceContext.Provider value={service}>
      <NavigationProvider>
        <Layout source={source} />
      </NavigationProvider>
    </ServiceContext.Provider>
  );
}
