import { isActiveReminder } from "@/features/reminders/lib/reminderFilters";
import { hasNavigableTarget } from "@/features/reminders/lib/reminderNavigation";
import type { Reminder } from "@/features/reminders/lib/reminderTypes";

/**
 * A bookmark is a NIP-ER kind-30300 event with no `not_before`: "a reminder
 * without `not_before` is a bookmark (saved item with no due time)". Defined
 * as pending-but-not-an-active-reminder so bookmarks and reminders partition
 * the kind by construction; the navigable-target check keeps note-only
 * reminders out. Every bookmark surface shares this one predicate.
 */
export function isBookmark(reminder: Reminder): boolean {
  return (
    reminder.content.status === "pending" &&
    !isActiveReminder(reminder) &&
    hasNavigableTarget(reminder.content.target)
  );
}

/**
 * One pass over the user's kind-30300 events: the bookmark list (newest
 * first) plus a target-message-id index. Saving the same message from two
 * devices yields two d-tags; keeping the array per key lets unsave cancel
 * every copy while the action bar treats the message as saved once.
 */
export function collectBookmarks(reminders: readonly Reminder[]): {
  bookmarks: Reminder[];
  byEventId: Map<string, Reminder[]>;
} {
  const bookmarks: Reminder[] = [];
  const byEventId = new Map<string, Reminder[]>();
  for (const reminder of reminders) {
    if (!isBookmark(reminder)) continue;
    bookmarks.push(reminder);
    const target = reminder.content.target;
    if (!target) continue;
    const group = byEventId.get(target.eventId) ?? [];
    group.push(reminder);
    byEventId.set(target.eventId, group);
  }
  bookmarks.sort((left, right) => right.createdAt - left.createdAt);
  return { bookmarks, byEventId };
}
