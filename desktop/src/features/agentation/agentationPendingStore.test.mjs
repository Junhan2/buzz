import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { JSDOM } from "jsdom";
import {
  agentationPathname,
  clearAllAgentationAnnotations,
  readAgentationAnnotations,
  readAllAgentationAnnotations,
} from "./agentationPendingStore.ts";

const dom = new JSDOM("<!doctype html>", { url: "http://localhost/one" });
Object.assign(globalThis, {
  Event: dom.window.Event,
  localStorage: dom.window.localStorage,
  window: dom.window,
});

beforeEach(() => localStorage.clear());

test("pending reads stay inside one identity/community scope", () => {
  const first = "wss://one:alice";
  const second = "wss://two:bob";
  localStorage.setItem(
    `feedback-annotations-${agentationPathname(first, "/one")}`,
    JSON.stringify([{ id: "first" }]),
  );
  localStorage.setItem(
    `feedback-annotations-${agentationPathname(second, "/one")}`,
    JSON.stringify([{ id: "second" }]),
  );

  assert.deepEqual(readAgentationAnnotations(first), [{ id: "first" }]);
  assert.deepEqual(readAllAgentationAnnotations(first), [{ id: "first" }]);
});

test("discard clears every route in only the selected scope", () => {
  const scope = "wss://one:alice";
  for (const pathname of ["/one", "/two"]) {
    localStorage.setItem(
      `feedback-annotations-${agentationPathname(scope, pathname)}`,
      JSON.stringify([{ id: pathname }]),
    );
  }
  localStorage.setItem(
    `feedback-annotations-${agentationPathname("other", "/one")}`,
    JSON.stringify([{ id: "other" }]),
  );

  clearAllAgentationAnnotations(scope);

  assert.deepEqual(readAllAgentationAnnotations(scope), []);
  assert.equal(readAllAgentationAnnotations("other").length, 1);
});

test("scope prefix boundaries prevent read and clear collisions", () => {
  const scope = "alice";
  const collidingScope = "alice-extra";
  localStorage.setItem(
    `feedback-annotations-${agentationPathname(collidingScope, "/one")}`,
    JSON.stringify([{ id: "other-scope" }]),
  );

  assert.deepEqual(readAllAgentationAnnotations(scope), []);
  clearAllAgentationAnnotations(scope);
  assert.deepEqual(readAllAgentationAnnotations(collidingScope), [
    { id: "other-scope" },
  ]);
});
