import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { apiClient } from "../lib/api-client.ts";
import { server } from "./server.ts";

// jsdom gaps used by Radix, sonner and the theme code.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
}
// axe-core probes canvas; jsdom doesn't implement it and logs noise otherwise.
HTMLCanvasElement.prototype.getContext = () => null;
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Any request without a handler fails the test. (MSW 3 renamed onUnhandledRequest to this.)
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  apiClient.resetSession();
  vi.useRealTimers();
  vi.restoreAllMocks();
  try {
    window.localStorage.clear();
  } catch (_error) {
    // ignore
  }
  delete document.documentElement.dataset.theme;
});

afterAll(() => server.close());
