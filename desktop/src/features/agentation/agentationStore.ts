import * as React from "react";
import type { AgentationDestination } from "./agentationDestination";

const EVENT = "buzz-agentation-destination-change";

function key(relayUrl: string, pubkey: string) {
  return `buzz:agentation:v1:${relayUrl}:${pubkey.toLowerCase()}`;
}

export function readAgentationDestination(
  relayUrl: string,
  pubkey: string,
): AgentationDestination | null {
  try {
    const raw = localStorage.getItem(key(relayUrl, pubkey));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AgentationDestination>;
    return typeof value.channelId === "string" &&
      typeof value.agentPubkey === "string"
      ? { channelId: value.channelId, agentPubkey: value.agentPubkey }
      : null;
  } catch {
    return null;
  }
}

export function writeAgentationDestination(
  relayUrl: string,
  pubkey: string,
  destination: AgentationDestination | null,
) {
  const storageKey = key(relayUrl, pubkey);
  if (destination)
    localStorage.setItem(storageKey, JSON.stringify(destination));
  else localStorage.removeItem(storageKey);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: storageKey }));
}

export function useAgentationDestination(relayUrl?: string, pubkey?: string) {
  const scopeKey = relayUrl && pubkey ? key(relayUrl, pubkey) : null;
  const [destination, setDestinationState] =
    React.useState<AgentationDestination | null>(() =>
      relayUrl && pubkey ? readAgentationDestination(relayUrl, pubkey) : null,
    );

  React.useEffect(() => {
    setDestinationState(
      relayUrl && pubkey ? readAgentationDestination(relayUrl, pubkey) : null,
    );
    if (!scopeKey || !relayUrl || !pubkey) return;
    const scopedRelayUrl = relayUrl;
    const scopedPubkey = pubkey;
    const sync = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== scopeKey) return;
      setDestinationState(
        readAgentationDestination(scopedRelayUrl, scopedPubkey),
      );
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [pubkey, relayUrl, scopeKey]);

  const setDestination = React.useCallback(
    (next: AgentationDestination | null) => {
      if (!relayUrl || !pubkey) return;
      writeAgentationDestination(relayUrl, pubkey, next);
    },
    [pubkey, relayUrl],
  );
  return [destination, setDestination] as const;
}
