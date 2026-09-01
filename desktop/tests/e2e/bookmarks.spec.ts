import { expect, test } from "@playwright/test";

import { waitForAnimations } from "../helpers/animations";
import { installMockBridge } from "../helpers/bridge";

const MOCK_PUBKEY = "deadbeef".repeat(8);
const GENERAL_CHANNEL_ID = "9a1657ac-f7aa-5db0-b632-d8bbeb6dfb50";
const ALICE_PUBKEY =
  "953d3363262e86b770419834c53d2446409db6d918a57f8f339d495d54ab001f";

async function gotoInboxHome(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByTestId("home-inbox")).toBeVisible();
}

// Saved is reached the same way as Reminders: the inbox filter dropdown.
async function openSavedFilter(page: import("@playwright/test").Page) {
  await page.getByTestId("inbox-filter-trigger").click();
  await page.getByRole("menuitemradio", { name: "Saved" }).click();
}

// Bookmarks share the reminders kind-30300 seed hook and query cache; see
// reminders.spec.ts for why the invalidate after seeding is required.
async function seedReminders(
  page: import("@playwright/test").Page,
  events: unknown[],
) {
  await page.evaluate((seeded) => {
    window.__BUZZ_E2E_SEED_MOCK_REMINDERS__?.(
      seeded as Parameters<
        NonNullable<typeof window.__BUZZ_E2E_SEED_MOCK_REMINDERS__>
      >[0],
    );
    window.__BUZZ_E2E_QUERY_CLIENT__?.invalidateQueries({
      queryKey: ["reminders"],
    });
  }, events);
}

// A bookmark is a kind-30300 event with NO `not_before` tag (NIP-ER: a
// reminder without one is a saved item).
function mockBookmarkEvent(opts: {
  id: string;
  dTag: string;
  content: string;
  createdAt?: number;
}) {
  return {
    id: opts.id,
    pubkey: MOCK_PUBKEY,
    created_at: opts.createdAt ?? Math.floor(Date.now() / 1000) - 300,
    kind: 30300,
    tags: [["d", opts.dTag]],
    content: opts.content,
    sig: "mocksig".repeat(20).slice(0, 128),
  };
}

function aliceBookmarkContent() {
  return JSON.stringify({
    target: {
      eventId: "mock-general-alice",
      channelId: GENERAL_CHANNEL_ID,
      preview: "Hey team — checking in.",
      authorPubkey: ALICE_PUBKEY,
    },
    status: "pending",
  });
}

function aliceReminderContent(note: string) {
  return JSON.stringify({
    target: {
      eventId: "mock-general-alice",
      channelId: GENERAL_CHANNEL_ID,
      preview: "Hey team — checking in.",
      authorPubkey: ALICE_PUBKEY,
    },
    note,
    status: "pending",
  });
}

test.describe("bookmarks", () => {
  test.beforeEach(async ({ page }) => {
    await installMockBridge(page);
  });

  test("01 — inbox filter dropdown shows Saved option", async ({ page }) => {
    await gotoInboxHome(page);

    await page.getByTestId("inbox-filter-trigger").click();
    await expect(
      page.getByRole("menuitemradio", { name: "Saved" }),
    ).toBeVisible();
    await waitForAnimations(page);
  });

  test("02 — hovering a message shows Save for later in the action bar", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("channel-general").click();
    await expect(page.getByTestId("chat-title")).toHaveText("general");

    const messageRow = page.getByTestId("message-row").first();
    await messageRow.hover();

    await expect(
      messageRow.getByRole("button", { name: "Save for later" }),
    ).toBeVisible();
    await waitForAnimations(page);
  });

  test("03 — Saved panel empty state", async ({ page }) => {
    await gotoInboxHome(page);

    await openSavedFilter(page);
    await expect(page.getByText("No saved messages")).toBeVisible();
    await waitForAnimations(page);
  });

  test("04 — seeded bookmark appears in Saved with author and source", async ({
    page,
  }) => {
    await gotoInboxHome(page);

    await seedReminders(page, [
      mockBookmarkEvent({
        id: "bookmark-01",
        dTag: "bm-01",
        content: aliceBookmarkContent(),
      }),
    ]);

    await openSavedFilter(page);
    const savedPanel = page.getByTestId("home-inbox-saved");
    await expect(savedPanel.getByTestId("home-saved-item-bm-01")).toBeVisible();
    await expect(savedPanel.getByText("alice", { exact: true })).toBeVisible();
    await expect(
      savedPanel.getByText("#general", { exact: true }),
    ).toBeVisible();
    await expect(savedPanel.getByText("Hey team — checking in.")).toBeVisible();
    await waitForAnimations(page);
    await page.screenshot({
      path: test.info().outputPath("saved-panel.png"),
    });
  });

  test("05 — bookmarks and reminders stay out of each other's views", async ({
    page,
  }) => {
    await gotoInboxHome(page);

    await seedReminders(page, [
      mockBookmarkEvent({
        id: "bookmark-sep-01",
        dTag: "bm-sep-01",
        content: aliceBookmarkContent(),
      }),
      {
        id: "reminder-sep-01",
        pubkey: MOCK_PUBKEY,
        created_at: Math.floor(Date.now() / 1000) - 300,
        kind: 30300,
        tags: [
          ["d", "rem-sep-01"],
          ["not_before", String(Math.floor(Date.now() / 1000) + 3600)],
        ],
        content: aliceReminderContent("Reply to Alice"),
        sig: "mocksig".repeat(20).slice(0, 128),
      },
    ]);

    await openSavedFilter(page);
    const savedPanel = page.getByTestId("home-inbox-saved");
    await expect(
      savedPanel.getByTestId("home-saved-item-bm-sep-01"),
    ).toBeVisible();
    await expect(savedPanel.getByText("Reply to Alice")).not.toBeVisible();

    // Let the Saved selection's dropdown fully close before reopening it —
    // a click that lands mid-close animation is swallowed by Radix.
    await waitForAnimations(page);
    await page.getByTestId("inbox-filter-trigger").click();
    await page.getByRole("menuitemradio", { name: "Reminders" }).click();
    const remindersPanel = page.getByTestId("home-inbox-reminders");
    await expect(
      remindersPanel.getByTestId("home-reminder-item-rem-sep-01"),
    ).toBeVisible();
    await expect(
      remindersPanel.getByTestId("home-saved-item-bm-sep-01"),
    ).not.toBeVisible();
    await waitForAnimations(page);
  });

  test("06 — action bar toggle saves, lists, and unsaves a message", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("channel-general").click();
    await expect(page.getByTestId("chat-title")).toHaveText("general");

    const messageRow = page
      .getByTestId("message-row")
      .filter({ hasText: "Hey team — checking in." })
      .first();
    await messageRow.hover();

    const saveButton = messageRow.getByTestId(
      "bookmark-message-mock-general-alice",
    );
    await expect(saveButton).toHaveAttribute("aria-label", "Save for later");
    await saveButton.click();

    // Publish round-trips through the mock relay's replaceable store, the
    // shared query invalidates, and the same button flips to the saved state.
    await expect(saveButton).toHaveAttribute("aria-label", "Remove from saved");
    await page.screenshot({
      path: test.info().outputPath("action-bar-saved.png"),
    });

    await page
      .getByTestId("sidebar-primary-menu")
      .getByRole("button", { name: "Inbox", exact: true })
      .click();
    await expect(page.getByTestId("home-inbox")).toBeVisible();
    await openSavedFilter(page);
    const savedPanel = page.getByTestId("home-inbox-saved");
    await expect(savedPanel.getByText("Hey team — checking in.")).toBeVisible();

    await savedPanel.getByRole("button", { name: "Remove from saved" }).click();
    await expect(page.getByText("No saved messages")).toBeVisible();
    await waitForAnimations(page);
  });

  test("07 — clicking a saved row navigates to the message in context", async ({
    page,
  }) => {
    await gotoInboxHome(page);

    await seedReminders(page, [
      mockBookmarkEvent({
        id: "bookmark-nav-01",
        dTag: "bm-nav-01",
        content: aliceBookmarkContent(),
      }),
    ]);

    await openSavedFilter(page);
    await page
      .getByTestId("home-saved-item-bm-nav-01")
      .getByRole("button")
      .first()
      .click();

    await expect(page.getByTestId("chat-title")).toHaveText("general");
    await expect(
      page.getByTestId("message-timeline").getByText("Hey team — checking in."),
    ).toBeVisible();
    await waitForAnimations(page);
  });
});
