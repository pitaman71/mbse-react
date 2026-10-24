import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configured, serviceFor } from "./config.js";
import { App } from "./ui/App.js";

const config = configured();
const source = config.source === "corpus" ? "golden corpus" : `live: ${import.meta.env.MBSE_REST_URL}`;
createRoot(document.getElementById("root")!).render(
  <StrictMode><App service={serviceFor(config)} source={source} /></StrictMode>,
);
