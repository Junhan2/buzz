import {
  clearAllAgentationAnnotations,
  readAllAgentationAnnotations,
} from "./agentationPendingStore";
import {
  clearRetainedAgentationSubmission,
  readRetainedAgentationSubmission,
} from "./agentationSubmissionStore";

export function readAgentationPendingBundle(scope: string) {
  return {
    annotations: readAllAgentationAnnotations(scope),
    retainedSubmission: readRetainedAgentationSubmission(scope),
  };
}

export function discardAgentationPendingBundle(scope: string) {
  clearAllAgentationAnnotations(scope);
  clearRetainedAgentationSubmission(scope);
}
