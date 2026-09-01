import * as React from "react";
import { toast } from "sonner";

import {
  useBookmarkMutations,
  useBookmarksQuery,
} from "@/features/bookmarks/hooks";
import type {
  Reminder,
  ReminderTarget,
} from "@/features/reminders/lib/reminderTypes";

type BookmarkContextValue = {
  /** Event IDs of messages the current user has saved, for toggle state. */
  savedEventIds: ReadonlySet<string>;
  /** The user's bookmarks, newest first — the Saved view's data. */
  bookmarks: readonly Reminder[];
  isLoading: boolean;
  /**
   * Save when unsaved, remove every duplicate copy when saved. Resolves when
   * the mutation settles; callers keep their own per-row pending state so a
   * toggle re-renders only the row it happened on.
   */
  toggleBookmark: (target: ReminderTarget) => Promise<void>;
};

const BookmarkContext = React.createContext<BookmarkContextValue>({
  savedEventIds: new Set(),
  bookmarks: [],
  isLoading: false,
  toggleBookmark: async () => {},
});

export function useBookmarks() {
  return React.useContext(BookmarkContext);
}

/**
 * Owns the save/unsave toggle every MessageActionBar reads. A context instead
 * of the `onRemindLater` prop-drilling pattern: MessageRow sits at the
 * file-size cap, and the action bar already consumes feature hooks directly.
 */
export function BookmarkProvider({
  pubkey,
  children,
}: {
  pubkey?: string;
  children: React.ReactNode;
}) {
  const { bookmarks, byEventId, savedEventIds, isLoading } =
    useBookmarksQuery(pubkey);
  const { save, remove } = useBookmarkMutations(pubkey ?? "");

  const saveAsync = save.mutateAsync;
  const removeAsync = remove.mutateAsync;
  const toggleBookmark = React.useCallback(
    async (target: ReminderTarget) => {
      if (!pubkey) return;
      const existing = byEventId.get(target.eventId);
      const isRemoval = Boolean(existing && existing.length > 0);
      try {
        if (existing && isRemoval) {
          await removeAsync(existing);
          toast.success("Removed from saved");
        } else {
          await saveAsync(target);
          toast.success("Saved for later");
        }
      } catch {
        toast.error(
          isRemoval ? "Failed to remove from saved" : "Failed to save message",
        );
      }
    },
    [byEventId, pubkey, removeAsync, saveAsync],
  );

  const contextValue = React.useMemo(
    () => ({ savedEventIds, bookmarks, isLoading, toggleBookmark }),
    [savedEventIds, bookmarks, isLoading, toggleBookmark],
  );

  return (
    <BookmarkContext.Provider value={contextValue}>
      {children}
    </BookmarkContext.Provider>
  );
}
