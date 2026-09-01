import assert from "node:assert/strict";
import test from "node:test";
import {
  eligibleAgentationAgents,
  eligibleAgentationChannels,
  formatAgentationMessage,
  resolveAgentationDestination,
} from "./agentationDestination.ts";

const channel = (overrides = {}) => ({
  id: "channel-1",
  name: "design",
  channelType: "stream",
  visibility: "open",
  description: "",
  topic: null,
  purpose: null,
  memberCount: 2,
  memberPubkeys: ["human", "agent"],
  lastMessageAt: null,
  archivedAt: null,
  participants: [],
  participantPubkeys: [],
  isMember: true,
  ttlSeconds: null,
  ttlDeadline: null,
  ...overrides,
});
const agent = (overrides = {}) => ({
  pubkey: "agent",
  ownerPubkey: "human",
  name: "designbot",
  agentType: "managed",
  channels: ["design"],
  channelIds: ["channel-1"],
  capabilities: [],
  status: "online",
  respondTo: "owner-only",
  respondToAllowlist: [],
  ...overrides,
});

test("channel eligibility is stream-only, joined, and unarchived", () => {
  const eligible = eligibleAgentationChannels([
    channel(),
    channel({ id: "forum", channelType: "forum" }),
    channel({ id: "dm", channelType: "dm" }),
    channel({ id: "left", isMember: false }),
    channel({ id: "archived", archivedAt: "now" }),
  ]);
  assert.deepEqual(
    eligible.map(({ id }) => id),
    ["channel-1"],
  );
});

test("agent eligibility requires membership, channel scope, and access", () => {
  assert.deepEqual(
    eligibleAgentationAgents(channel(), [agent()], "human").map(
      ({ pubkey }) => pubkey,
    ),
    ["agent"],
  );
  assert.equal(
    eligibleAgentationAgents(channel(), [agent()], "stranger").length,
    0,
  );
  assert.equal(
    eligibleAgentationAgents(
      channel({ memberPubkeys: ["human"] }),
      [agent()],
      "human",
    ).length,
    0,
  );
});

test("destination is revalidated against current channel and agent data", () => {
  assert.equal(
    resolveAgentationDestination(
      { channelId: "channel-1", agentPubkey: "agent" },
      [channel()],
      [agent()],
      "human",
    ).valid,
    true,
  );
  assert.equal(
    resolveAgentationDestination(
      { channelId: "channel-1", agentPubkey: "agent" },
      [channel({ archivedAt: "now" })],
      [agent()],
      "human",
    ).valid,
    false,
  );
});

test("message visibly addresses the agent and carries a stable submission id", () => {
  assert.equal(
    formatAgentationMessage(
      "designbot",
      "## Feedback\nDo this",
      "submission-1",
    ),
    "@designbot Design feedback from Agentation:\n\n## Feedback\nDo this\n\n<!-- agentation-submission:submission-1 -->",
  );
});
