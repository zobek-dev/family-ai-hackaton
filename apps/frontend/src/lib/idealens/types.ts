export type IdeaLensWorkspace = {
  idea: string;
  region: string;
  businessModel: string;
  goal: string;
  snapshot: StartupSnapshot;
  personas: Persona[];
  selectedPersonaId: string | null;
  assumptions: Assumption[];
  experiments: Experiment[];
  scorecard: ValidationScorecard;
  interviewScript: InterviewScript | null;
  agentState: AgentState;
};

export type StartupSnapshot = {
  problem: string;
  customer: string;
  solution: string;
  category: string;
  wedge: string;
  monetization: string;
  mainAssumption: string;
  validationPriority: string;
};

export type Persona = {
  id: string;
  name: string;
  description: string;
  painIntensity: "Low" | "Medium" | "High";
  budgetLevel: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  acquisitionChannel: string;
  objections: string[];
};

export type Assumption = {
  id: string;
  text: string;
  category:
    | "Customer"
    | "Problem"
    | "Solution"
    | "Market"
    | "Distribution"
    | "Monetization";
  importance: "Low" | "Medium" | "High";
  status: "Unknown" | "Risky" | "Validated" | "Invalidated";
  testMethod: string;
};

export type Experiment = {
  id: string;
  title: string;
  hypothesis: string;
  method: string;
  successMetric: string;
  effort: "Low" | "Medium" | "High";
  cost: "Free" | "Low" | "Medium";
  duration: string;
  status: "Backlog" | "This Week" | "Running" | "Done";
  relatedAssumptionId?: string;
};

export type ValidationScorecard = {
  overallScore: number;
  decision: string;
  biggestRisk: string;
  recommendedNextStep: string;
  dimensions: {
    problemClarity: number;
    customerSpecificity: number;
    urgency: number;
    differentiation: number;
    monetizationClarity: number;
    mvpFeasibility: number;
    distributionFeasibility: number;
    evidenceStrength: number;
  };
};

export type InterviewScript = {
  title: string;
  targetPersona: string;
  goal: string;
  questions: {
    id: string;
    question: string;
    purpose: string;
    goodSignal: string;
    redFlag: string;
  }[];
};

export type AgentState = {
  status: "Idle" | "Thinking" | "Updating" | "WaitingForUser";
  currentObjective: string;
  confidence: number;
  suggestions: string[];
  activityLog: string[];
  isMockActive: boolean;
};

export type IdeaLensComponentType =
  | "startup_snapshot_card"
  | "persona_cards"
  | "assumption_map"
  | "experiment_list"
  | "validation_scorecard"
  | "interview_script_panel";

export type ComponentDescriptor = {
  id: string;
  type: IdeaLensComponentType;
  props: Record<string, unknown>;
};
