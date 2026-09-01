import type { Channel, RelayAgent } from "@/shared/api/types";
import type { AgentationDestination } from "./agentationDestination";
import {
  eligibleAgentationAgents,
  eligibleAgentationChannels,
} from "./agentationDestination";

type Props = {
  agents: readonly RelayAgent[];
  channels: readonly Channel[];
  currentPubkey?: string;
  destination: AgentationDestination | null;
  onChange: (destination: AgentationDestination | null) => void;
};

export function AgentationDestinationFields({
  agents,
  channels,
  currentPubkey,
  destination,
  onChange,
}: Props) {
  const eligibleChannels = eligibleAgentationChannels(channels);
  const channel = eligibleChannels.find(
    (candidate) => candidate.id === destination?.channelId,
  );
  const eligibleAgents = eligibleAgentationAgents(
    channel,
    agents,
    currentPubkey,
  );

  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-xs font-medium">
        Send to channel
        <select
          className="h-9 w-full rounded-lg border border-input/40 bg-background px-3 text-sm"
          onChange={(event) =>
            onChange(
              event.target.value
                ? { channelId: event.target.value, agentPubkey: "" }
                : null,
            )
          }
          value={channel?.id ?? ""}
        >
          <option value="">Choose a channel</option>
          {eligibleChannels.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              #{candidate.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium">
        Address agent
        <select
          className="h-9 w-full rounded-lg border border-input/40 bg-background px-3 text-sm disabled:opacity-50"
          disabled={!channel}
          onChange={(event) =>
            onChange(
              channel && event.target.value
                ? { channelId: channel.id, agentPubkey: event.target.value }
                : channel
                  ? { channelId: channel.id, agentPubkey: "" }
                  : null,
            )
          }
          value={
            eligibleAgents.some(
              (candidate) => candidate.pubkey === destination?.agentPubkey,
            )
              ? destination?.agentPubkey
              : ""
          }
        >
          <option value="">
            {channel && eligibleAgents.length === 0
              ? "No addressable agents"
              : "Choose an agent"}
          </option>
          {eligibleAgents.map((agent) => (
            <option key={agent.pubkey} value={agent.pubkey}>
              {agent.name}
            </option>
          ))}
        </select>
        {channel && eligibleAgents.length === 0 ? (
          <span className="font-normal text-muted-foreground">
            Add an agent to this channel before routing annotations.
          </span>
        ) : null}
      </label>
    </div>
  );
}
