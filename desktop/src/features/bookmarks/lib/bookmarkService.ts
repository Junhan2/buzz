import { randomDTag } from "@/features/reminders/lib/reminderService";
import type {
  ReminderContent,
  ReminderTarget,
} from "@/features/reminders/lib/reminderTypes";
import { relayClient } from "@/shared/api/relayClient";
import { nip44EncryptToSelf, signRelayEvent } from "@/shared/api/tauri";
import type { RelayEvent } from "@/shared/api/types";
import { KIND_EVENT_REMINDER } from "@/shared/constants/kinds";

/**
 * Publish a bookmark: a kind-30300 NIP-ER event whose tags carry only the
 * random `d` identifier — omitting `not_before` is what makes it a saved
 * item instead of a scheduled reminder. Unsave needs no counterpart here:
 * `cancelReminder` already replaces a d-tag with a cancelled, expiring event.
 */
export async function createBookmark(
  target: ReminderTarget,
): Promise<RelayEvent> {
  const content: ReminderContent = { target, status: "pending" };
  const ciphertext = await nip44EncryptToSelf(JSON.stringify(content));
  const event = await signRelayEvent({
    kind: KIND_EVENT_REMINDER,
    content: ciphertext,
    tags: [["d", randomDTag()]],
  });
  return relayClient.publishEvent(
    event,
    "Timed out saving message.",
    "Failed to save message.",
  );
}
