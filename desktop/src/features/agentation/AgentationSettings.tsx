import { useRelayAgentsQuery } from "@/features/agents/hooks";
import { useChannelsQuery } from "@/features/channels/hooks";
import { useCommunities } from "@/features/communities/useCommunities";
import { useIdentityQuery } from "@/shared/api/hooks";
import { AgentationDestinationFields } from "./AgentationDestinationFields";
import { useAgentationDestination } from "./agentationStore";

export function AgentationSettings() {
  const identity = useIdentityQuery();
  const { activeCommunity } = useCommunities();
  const channels = useChannelsQuery();
  const agents = useRelayAgentsQuery();
  const [destination, setDestination] = useAgentationDestination(
    activeCommunity?.relayUrl,
    identity.data?.pubkey,
  );
  return (
    <div className="w-full space-y-3 py-1">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="h-2 w-2 rounded-full bg-emerald-500" />
        Ready on this computer
      </p>
      <AgentationDestinationFields
        agents={agents.data ?? []}
        channels={channels.data ?? []}
        currentPubkey={identity.data?.pubkey}
        destination={destination}
        onChange={setDestination}
      />
      <p className="text-xs text-muted-foreground">
        Annotations can include visible text from the screen. Nothing is sent
        until you choose Send.
      </p>
    </div>
  );
}
