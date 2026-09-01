import assert from "node:assert/strict";
import { after, test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!doctype html><html><head></head><body></body></html>",
  {
    url: "http://localhost/channel/test",
  },
);
Object.assign(globalThis, {
  cancelAnimationFrame: (id) => dom.window.clearTimeout(id),
  document: dom.window.document,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
  Node: dom.window.Node,
  requestAnimationFrame: (callback) =>
    dom.window.setTimeout(() => callback(Date.now()), 0),
  window: dom.window,
});
dom.window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
dom.window.requestAnimationFrame = (callback) =>
  dom.window.setTimeout(() => callback(Date.now()), 0);
dom.window.cancelAnimationFrame = (id) => dom.window.clearTimeout(id);

after(() => dom.window.close());

test("patched production Agentation renders with a storage scope", async () => {
  const { createElement } = await import("react");
  const { render, waitFor } = await import("@testing-library/react");
  const { Agentation } = await import("agentation");

  const rendered = render(
    createElement(Agentation, {
      copyToClipboard: false,
      storageScope: "relay.example:pubkey",
    }),
  );

  await waitFor(
    () => assert.ok(document.querySelector("[data-agentation-toolbar]")),
    { timeout: 5_000 },
  );
  rendered.unmount();
});
