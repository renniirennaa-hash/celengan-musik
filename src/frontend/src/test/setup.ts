import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Generated components expose stable `data-ocid` hooks; use them as test ids.
configure({ testIdAttribute: "data-ocid" });

// Recharts' ResponsiveContainer observes its box; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
