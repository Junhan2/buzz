const STORAGE_PREFIX = "feedback-annotations-";
export const AGENTATION_PENDING_CHANGE = "buzz-agentation-pending-change";

export function agentationScope(relayUrl?: string, pubkey?: string) {
  return `${relayUrl ?? "no-community"}:${pubkey ?? "no-identity"}`;
}

export function agentationPathname(
  scope: string,
  pathname = window.location.pathname,
) {
  return `/buzz/${encodeURIComponent(scope)}${pathname}`;
}

function scopeStoragePrefix(scope: string) {
  return `${STORAGE_PREFIX}/buzz/${encodeURIComponent(scope)}/`;
}

export function readAgentationAnnotations(scope: string): unknown[] {
  try {
    const raw = localStorage.getItem(
      `${STORAGE_PREFIX}${agentationPathname(scope)}`,
    );
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readAllAgentationAnnotations(scope: string): unknown[] {
  const found: unknown[] = [];
  try {
    const prefix = scopeStoragePrefix(scope);
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(parsed)) found.push(...parsed);
    }
  } catch {
    return found;
  }
  return found;
}

export function clearAllAgentationAnnotations(scope: string) {
  const keys: string[] = [];
  const prefix = scopeStoragePrefix(scope);
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
  window.dispatchEvent(new Event(AGENTATION_PENDING_CHANGE));
}

export function emitAgentationPendingChange(_pendingCount?: number) {
  window.dispatchEvent(new Event(AGENTATION_PENDING_CHANGE));
}
