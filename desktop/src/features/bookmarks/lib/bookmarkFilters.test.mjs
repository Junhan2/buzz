import assert from "node:assert/strict";
import test from "node:test";

import { collectBookmarks, isBookmark } from "./bookmarkFilters.ts";

/**
 * Build a Reminder fixture. Bookmark detection reads `status`, `notBefore`,
 * and the target's field presence; `createdAt` orders the collected list.
 */
function reminder({
  id = "r",
  notBefore,
  status = "pending",
  target,
  createdAt = 0,
}) {
  return {
    id,
    eventId: `${id}-evt`,
    notBefore,
    createdAt,
    content: { status, target },
  };
}

const TARGET = {
  eventId: "msg-1",
  channelId: "chan-1",
  preview: "hello",
  authorPubkey: "author-1",
};

test("isBookmark_pending_targeted_without_notBefore_is_bookmark", () => {
  assert.equal(isBookmark(reminder({ target: TARGET })), true);
});

test("isBookmark_with_notBefore_is_a_reminder_not_a_bookmark", () => {
  assert.equal(
    isBookmark(reminder({ target: TARGET, notBefore: 1_000 })),
    false,
  );
});

test("isBookmark_cancelled_is_not_a_bookmark", () => {
  assert.equal(
    isBookmark(reminder({ target: TARGET, status: "cancelled" })),
    false,
  );
});

test("isBookmark_done_is_not_a_bookmark", () => {
  assert.equal(isBookmark(reminder({ target: TARGET, status: "done" })), false);
});

test("isBookmark_without_target_is_not_a_bookmark", () => {
  assert.equal(isBookmark(reminder({})), false);
});

test("isBookmark_empty_target_fields_are_not_navigable", () => {
  assert.equal(
    isBookmark(reminder({ target: { ...TARGET, channelId: "" } })),
    false,
  );
});

test("collectBookmarks_sorts_newest_first_and_groups_duplicates", () => {
  const { bookmarks, byEventId } = collectBookmarks([
    reminder({ id: "a", target: TARGET, createdAt: 10 }),
    reminder({ id: "b", target: TARGET, createdAt: 30 }),
    reminder({
      id: "c",
      target: { ...TARGET, eventId: "msg-2" },
      createdAt: 20,
    }),
    reminder({ id: "d", target: TARGET, notBefore: 1_000, createdAt: 40 }),
  ]);
  assert.deepEqual(
    bookmarks.map((r) => r.id),
    ["b", "c", "a"],
  );
  assert.equal(byEventId.size, 2);
  assert.deepEqual(
    byEventId.get("msg-1")?.map((r) => r.id),
    ["a", "b"],
  );
  assert.equal(byEventId.get("msg-2")?.length, 1);
});

test("collectBookmarks_excludes_non_bookmarks_entirely", () => {
  const { bookmarks, byEventId } = collectBookmarks([
    reminder({ id: "sched", target: TARGET, notBefore: 1_000 }),
    reminder({ id: "note-only" }),
    reminder({ id: "gone", target: TARGET, status: "cancelled" }),
  ]);
  assert.equal(bookmarks.length, 0);
  assert.equal(byEventId.size, 0);
});
