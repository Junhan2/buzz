import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
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

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

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

test("production Send and S shortcut follow explicit destination eligibility", async () => {
  const { createElement } = await import("react");
  const { fireEvent, render, waitFor } = await import("@testing-library/react");
  const { Agentation } = await import("agentation");
  const target = document.createElement("div");
  target.id = "eligibility-target";
  target.textContent = "Target";
  document.body.append(target);
  let submissions = 0;
  const props = {
    copyToClipboard: false,
    demoAnnotations: [{ selector: "#eligibility-target", comment: "Fix it" }],
    demoDelay: 250,
    enableDemoMode: true,
    onSubmit: async () => {
      submissions += 1;
      return { ok: false };
    },
    storageScope: "eligibility-scope",
  };
  const rendered = render(
    createElement(Agentation, { ...props, submitEnabled: false }),
  );
  const send = await waitFor(() => {
    const candidate = document.querySelector("[data-agentation-send]");
    assert.ok(candidate);
    assert.equal(candidate.disabled, true);
    return candidate;
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  fireEvent.click(send);
  const invalidShortcut = new dom.window.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "s",
  });
  document.dispatchEvent(invalidShortcut);
  assert.equal(invalidShortcut.defaultPrevented, false);
  assert.equal(submissions, 0);

  rendered.rerender(
    createElement(Agentation, { ...props, submitEnabled: true }),
  );
  await waitFor(() => assert.equal(send.disabled, false));
  const validShortcut = new dom.window.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "s",
  });
  document.dispatchEvent(validShortcut);
  assert.equal(validShortcut.defaultPrevented, true);
  await waitFor(() => assert.equal(submissions, 1));
  rendered.unmount();
});

test("accepted submit clears its snapshot but preserves annotations added in flight", async () => {
  const { createElement } = await import("react");
  const { fireEvent, render, waitFor } = await import("@testing-library/react");
  const { Agentation } = await import("agentation");
  const target = document.createElement("div");
  target.id = "deferred-target";
  target.textContent = "Deferred";
  document.body.append(target);
  let resolveSubmit;
  const cleared = [];
  const rendered = render(
    createElement(Agentation, {
      copyToClipboard: false,
      demoAnnotations: [
        { selector: "#deferred-target", comment: "A" },
        { selector: "#deferred-target", comment: "B" },
      ],
      demoDelay: 250,
      enableDemoMode: true,
      onAnnotationsClear: (batch) => cleared.push(batch),
      onSubmit: () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
      storageScope: "deferred-scope",
      submitEnabled: true,
    }),
  );
  const send = await waitFor(
    () => {
      const candidate = document.querySelector("[data-agentation-send]");
      assert.ok(candidate);
      assert.equal(candidate.disabled, false);
      assert.equal(candidate.textContent?.includes("1"), true);
      return candidate;
    },
    { timeout: 2_000 },
  );
  fireEvent.click(send);
  await waitFor(
    () => {
      const scoped = JSON.parse(
        localStorage.getItem(
          "feedback-annotations-/buzz/deferred-scope/channel/test",
        ) ?? "[]",
      );
      assert.equal(scoped.length, 2);
    },
    { timeout: 2_000 },
  );
  resolveSubmit({ ok: true });
  await waitFor(() => assert.equal(cleared.length, 1), { timeout: 2_000 });
  assert.deepEqual(
    cleared[0].map((annotation) => annotation.comment),
    ["A"],
  );
  const scoped = JSON.parse(
    localStorage.getItem(
      "feedback-annotations-/buzz/deferred-scope/channel/test",
    ) ?? "[]",
  );
  assert.deepEqual(
    scoped.map((annotation) => annotation.comment),
    ["B"],
  );
  rendered.unmount();
});
