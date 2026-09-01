import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { collectBookmarks } from "@/features/bookmarks/lib/bookmarkFilters";
import { createBookmark } from "@/features/bookmarks/lib/bookmarkService";
import {
  remindersQueryKey,
  useRemindersQuery,
} from "@/features/reminders/hooks";
import { cancelReminder } from "@/features/reminders/lib/reminderService";
import type {
  Reminder,
  ReminderTarget,
} from "@/features/reminders/lib/reminderTypes";

/**
 * Bookmarks piggyback on the reminders query — both are the user's kind-30300
 * events, so one cache and one invalidation spine keep the action-bar toggle,
 * the Saved list, and every reminder surface consistent.
 */
export function useBookmarksQuery(pubkey: string | undefined) {
  const query = useRemindersQuery(pubkey);
  const data = query.data;
  const derived = React.useMemo(() => {
    const { bookmarks, byEventId } = collectBookmarks(data ?? []);
    const savedEventIds: ReadonlySet<string> = new Set(byEventId.keys());
    return { bookmarks, byEventId, savedEventIds };
  }, [data]);
  return { ...derived, isLoading: query.isLoading };
}

/**
 * Save/remove both invalidate the shared reminders query, same as
 * `useReminderMutations`. Remove cancels every duplicate d-tag for the
 * message (multi-device saves), so one unsave clears the state everywhere.
 */
export function useBookmarkMutations(pubkey: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: remindersQueryKey(pubkey) });

  const save = useMutation({
    mutationFn: (target: ReminderTarget) => createBookmark(target),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (bookmarks: Reminder[]) =>
      Promise.all(
        bookmarks.map((bookmark) => cancelReminder(pubkey, bookmark)),
      ),
    onSuccess: invalidate,
  });

  return { save, remove };
}
