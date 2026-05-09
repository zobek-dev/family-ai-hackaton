import { StartupSnapshotCard } from "@/components/idealens/StartupSnapshotCard";
import { PersonaCards } from "@/components/idealens/PersonaCards";
import { AssumptionMap } from "@/components/idealens/AssumptionMap";
import { ExperimentList } from "@/components/idealens/ExperimentList";
import { ValidationScorecard } from "@/components/idealens/ValidationScorecard";
import { InterviewScriptPanel } from "@/components/idealens/InterviewScriptPanel";

export const componentRegistry = {
  startup_snapshot_card: StartupSnapshotCard,
  persona_cards: PersonaCards,
  assumption_map: AssumptionMap,
  experiment_list: ExperimentList,
  validation_scorecard: ValidationScorecard,
  interview_script_panel: InterviewScriptPanel,
} as const;

export type ComponentType = keyof typeof componentRegistry;
