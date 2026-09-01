import { lazy, Suspense } from "react";
import { useFeatureEnabled } from "@/shared/features";

const LazyAgentationExperiment = lazy(() =>
  import("./AgentationExperimentRoot").then((module) => ({
    default: module.AgentationExperimentRoot,
  })),
);

/** Keeps the third-party Agentation bundle entirely out of the disabled path. */
export function AgentationExperimentGate() {
  const enabled = useFeatureEnabled("agentationDesign");
  if (!enabled) return null;
  return (
    <Suspense fallback={null}>
      <LazyAgentationExperiment />
    </Suspense>
  );
}
