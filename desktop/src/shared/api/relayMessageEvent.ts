import { KIND_STREAM_MESSAGE } from "@/shared/constants/kinds";
import { signRelayEvent } from "@/shared/api/tauri";

/** Creates the ordinary signed kind-9 event used by message publication. */
export function createRelayMessageEvent(
  channelId: string,
  content: string,
  mentionPubkeys: string[] = [],
  extraTags: string[][] = [],
) {
  return signRelayEvent({
    kind: KIND_STREAM_MESSAGE,
    content: content.trim(),
    tags: [
      ["h", channelId],
      ...mentionPubkeys.map((pubkey) => ["p", pubkey]),
      ...extraTags,
    ],
  });
}
