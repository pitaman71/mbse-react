import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// a test's first `findBy…` waits for the schemas and the first views, which can take over the default second under load
configure({ asyncUtilTimeout: 5000 });

afterEach(() => cleanup());
