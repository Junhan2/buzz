import * as React from "react";
import { AgentationSettings } from "@/features/agentation/AgentationSettings";
import { useCommunities } from "@/features/communities/useCommunities";
import { useIdentityQuery } from "@/shared/api/hooks";
import {
  AGENTATION_PENDING_CHANGE,
  agentationScope,
  clearAllAgentationAnnotations,
  readAllAgentationAnnotations,
} from "@/features/agentation/agentationPendingStore";
import { setAgentManagedProfiles } from "@/shared/api/tauri";
import { desktopFeatures, useFeatureToggle } from "@/shared/features";
import type { FeatureDefinition } from "@/shared/features";
import { Switch } from "@/shared/ui/switch";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { SettingsOptionGroup, SettingsOptionRow } from "./SettingsOptionGroup";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

function FeatureRow({ feature }: { feature: FeatureDefinition }) {
  const [enabled, toggle] = useFeatureToggle(feature.id);
  const switchId = `feature-toggle-${feature.id}`;
  if (feature.id === "agentationDesign") {
    return <AgentationFeatureRow feature={feature} />;
  }

  return (
    <SettingsOptionRow className="flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" id={`${switchId}-label`}>
          {feature.name}
        </p>
        <p className="text-xs text-muted-foreground/70" data-settings-subcopy>
          {feature.description}
        </p>
      </div>
      <Switch
        aria-labelledby={`${switchId}-label`}
        checked={enabled}
        data-testid={switchId}
        onCheckedChange={(value) => {
          toggle(value);
          if (feature.id === "agentManagedProfiles") {
            void setAgentManagedProfiles(value).catch((error) => {
              console.error(
                "Failed to apply agent-managed profiles setting:",
                error,
              );
            });
          }
        }}
      />
    </SettingsOptionRow>
  );
}

function AgentationFeatureRow({ feature }: { feature: FeatureDefinition }) {
  const [enabled, toggle] = useFeatureToggle(feature.id);
  const switchId = `feature-toggle-${feature.id}`;
  const identity = useIdentityQuery();
  const { activeCommunity } = useCommunities();
  const scope = agentationScope(
    activeCommunity?.relayUrl,
    identity.data?.pubkey,
  );
  const [offboardingOpen, setOffboardingOpen] = React.useState(false);
  const [pending, setPending] = React.useState(() =>
    readAllAgentationAnnotations(scope),
  );
  React.useEffect(() => {
    const refresh = () => setPending(readAllAgentationAnnotations(scope));
    refresh();
    window.addEventListener(AGENTATION_PENDING_CHANGE, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AGENTATION_PENDING_CHANGE, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [scope]);

  const disableAgentation = () => {
    toggle(false);
    setOffboardingOpen(false);
  };

  const exportPending = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(pending, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "buzz-agentation-annotations.json";
    link.click();
    URL.revokeObjectURL(url);
    disableAgentation();
  };

  return (
    <SettingsOptionRow className="flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" id={`${switchId}-label`}>
          {feature.name}
        </p>
        <p className="text-xs text-muted-foreground/70" data-settings-subcopy>
          {feature.description}
        </p>
      </div>
      <Switch
        aria-labelledby={`${switchId}-label`}
        checked={enabled}
        data-testid={switchId}
        onCheckedChange={(value) => {
          if (!value && pending.length > 0) {
            setOffboardingOpen(true);
            return;
          }
          toggle(value);
        }}
      />
      {enabled ? <AgentationSettings /> : null}
      <AlertDialog onOpenChange={setOffboardingOpen} open={offboardingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off Agentation?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {pending.length} pending annotation
              {pending.length === 1 ? "" : "s"}. Keep them locally for next
              time, export a JSON copy, or discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={disableAgentation} variant="outline">
              Keep locally
            </Button>
            <Button onClick={exportPending} variant="outline">
              Export and turn off
            </Button>
            <Button
              onClick={() => {
                clearAllAgentationAnnotations(scope);
                disableAgentation();
              }}
              variant="destructive"
            >
              Discard and turn off
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsOptionRow>
  );
}

export function ExperimentalFeaturesCard() {
  // Manifest is preview-only by definition; every desktop entry is a preview
  // feature.
  const previewFeatures = desktopFeatures;

  return (
    <section className="min-w-0" data-testid="settings-experimental">
      <SettingsSectionHeader
        title="Experiments"
        description={
          <>
            These features are functional but still being refined. Enable them
            to try new capabilities early.
          </>
        }
      />

      <SettingsOptionGroup title="Features">
        {previewFeatures.map((f) => (
          <FeatureRow feature={f} key={f.id} />
        ))}
      </SettingsOptionGroup>
    </section>
  );
}
