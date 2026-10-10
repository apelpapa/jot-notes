import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
});
Object.defineProperty(window, "requestAnimationFrame", {
  writable: true, value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
});
Object.defineProperty(window, "cancelAnimationFrame", { writable: true, value: window.clearTimeout.bind(window) });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); });
