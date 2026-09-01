import { Bookmark, BookmarkX } from "lucide-react";
import * as React from "react";

import { useBookmarks } from "@/features/bookmarks/ui/BookmarkProvider";
import type { Reminder } from "@/features/reminders/lib/reminderTypes";
import {
  ReminderSourceLine,
  useReminderNavigation,
  useReminderSources,
  type ReminderSource,
} from "@/features/reminders/ui/RemindersPanel";
import { formatItemTimestamp } from "@/shared/lib/datetime";
import { Button } from "@/shared/ui/button";

function SavedRow({
  bookmark,
  onNavigate,
  onRemove,
  source,
}: {
  bookmark: Reminder;
  onNavigate: (bookmark: Reminder) => void;
  onRemove: (bookmark: Reminder) => Promise<void>;
  source: ReminderSource | null;
}) {
  // Local so removing this row disables only this row's button.
  const [isRemoving, setIsRemoving] = React.useState(false);

  return (
    <div
      className="flex items-start gap-3 border-b border-border/45 px-4 py-4 transition-colors focus-within:bg-muted/40 hover:bg-muted/40"
      data-testid={`home-saved-item-${bookmark.id}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bookmark className="h-4 w-4" />
      </span>
      <button
        className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left enabled:hover:opacity-80"
        onClick={() => onNavigate(bookmark)}
        type="button"
      >
        {source ? <ReminderSourceLine source={source} /> : null}
        <p className="max-w-full truncate text-sm font-medium">
          {bookmark.content.target?.preview || "Saved message"}
        </p>
        <p className="text-xs text-muted-foreground">
          Saved {formatItemTimestamp(bookmark.createdAt)}
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          className="h-7 w-7 p-0"
          data-testid={`home-saved-item-remove-${bookmark.id}`}
          disabled={isRemoving}
          onClick={() => {
            setIsRemoving(true);
            void onRemove(bookmark).finally(() => {
              setIsRemoving(false);
            });
          }}
          size="sm"
          title="Remove from saved"
          type="button"
          variant="ghost"
        >
          <BookmarkX className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The Saved inbox view: every bookmark the user has, newest first, read from
 * the shared BookmarkProvider. Rows navigate straight to the message — no
 * detail pane — resolving the thread root the same way reminder rows do.
 */
export function SavedPanel() {
  const { bookmarks, isLoading, toggleBookmark } = useBookmarks();
  const sources = useReminderSources(bookmarks);
  const handleNavigate = useReminderNavigation();

  const handleRemove = React.useCallback(
    (bookmark: Reminder) => {
      const target = bookmark.content.target;
      return target ? toggleBookmark(target) : Promise.resolve();
    },
    [toggleBookmark],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading saved messages...
        </p>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8">
        <Bookmark className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No saved messages</p>
        <p className="text-xs text-muted-foreground/70">
          Use "Save for later" on any message to keep it here.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {bookmarks.map((bookmark) => (
        <SavedRow
          bookmark={bookmark}
          key={bookmark.id}
          onNavigate={handleNavigate}
          onRemove={handleRemove}
          source={sources.get(bookmark.id) ?? null}
        />
      ))}
    </div>
  );
}
