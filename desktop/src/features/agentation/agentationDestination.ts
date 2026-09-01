import type { Channel, RelayAgent } from "@/shared/api/types";
import { normalizePubkey } from "@/shared/lib/pubkey";

export type AgentationDestination = {
  channelId: string;
  agentPubkey: string;
};

export function eligibleAgentationChannels(channels: readonly Channel[]) {
  return channels.filter(
    (channel) =>
      channel.channelType === "stream" &&
      channel.isMember &&
      channel.archivedAt === null,
  );
}

export function eligibleAgentationAgents(
  channel: Channel | undefined,
  agents: readonly RelayAgent[],
  currentPubkey: string | undefined,
) {
  if (!channel) return [];
  const members = new Set(channel.memberPubkeys.map(normalizePubkey));
  const viewer = currentPubkey ? normalizePubkey(currentPubkey) : null;
  return agents.filter((agent) => {
    const agentPubkey = normalizePubkey(agent.pubkey);
    if (!members.has(agentPubkey) || !agent.channelIds.includes(channel.id)) {
      return false;
    }
    if (agent.respondTo === "anyone") return true;
    if (agent.respondTo === "owner-only") {
      return Boolean(
        viewer &&
          agent.ownerPubkey &&
          normalizePubkey(agent.ownerPubkey) === viewer,
      );
    }
    return Boolean(
      viewer &&
        agent.respondTo === "allowlist" &&
        agent.respondToAllowlist.map(normalizePubkey).includes(viewer),
    );
  });
}

export function resolveAgentationDestination(
  destination: AgentationDestination | null,
  channels: readonly Channel[],
  agents: readonly RelayAgent[],
  currentPubkey: string | undefined,
) {
  const channel = eligibleAgentationChannels(channels).find(
    (candidate) => candidate.id === destination?.channelId,
  );
  const agent = eligibleAgentationAgents(channel, agents, currentPubkey).find(
    (candidate) =>
      normalizePubkey(candidate.pubkey) ===
      normalizePubkey(destination?.agentPubkey ?? ""),
  );
  return { channel, agent, valid: Boolean(channel && agent) };
}

export function formatAgentationMessage(
  agentName: string,
  output: string,
  submissionId: string,
) {
  return `@${agentName} Design feedback from Agentation:\n\n${output.trim()}\n\n<!-- agentation-submission:${submissionId} -->`;
}
