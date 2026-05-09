"""IdeaLens canvas fields — extends LangGraph agent state so snapshots round-trip."""

from __future__ import annotations

from typing import Annotated, Any, Optional

from langchain.agents.middleware.types import AgentMiddleware, AgentState
from typing_extensions import NotRequired, TypedDict


def _replace(left: Any, right: Any) -> Any:
    return right


class _StartupSnapshot(TypedDict, total=False):
    problem: str
    customer: str
    solution: str
    category: str
    wedge: str
    monetization: str
    mainAssumption: str
    validationPriority: str


class _ScoreDimensions(TypedDict, total=False):
    problemClarity: float
    customerSpecificity: float
    urgency: float
    differentiation: float
    monetizationClarity: float
    mvpFeasibility: float
    distributionFeasibility: float
    evidenceStrength: float


class _Scorecard(TypedDict, total=False):
    overallScore: float
    decision: str
    biggestRisk: str
    recommendedNextStep: str
    dimensions: _ScoreDimensions


class _AgentUiState(TypedDict, total=False):
    status: str
    currentObjective: str
    confidence: float
    suggestions: list[str]
    activityLog: list[str]
    isMockActive: bool


class IdeaLensCanvasState(AgentState):
    """Flat IdeaLens workspace keys — mirrors TS IdeaLensWorkspace."""

    idea: NotRequired[Annotated[str, _replace]]
    region: NotRequired[Annotated[str, _replace]]
    businessModel: NotRequired[Annotated[str, _replace]]
    goal: NotRequired[Annotated[str, _replace]]
    snapshot: NotRequired[Annotated[_StartupSnapshot, _replace]]
    personas: NotRequired[Annotated[list[Any], _replace]]
    selectedPersonaId: NotRequired[Annotated[Optional[str], _replace]]
    assumptions: NotRequired[Annotated[list[Any], _replace]]
    experiments: NotRequired[Annotated[list[Any], _replace]]
    scorecard: NotRequired[Annotated[_Scorecard, _replace]]
    interviewScript: NotRequired[Annotated[Optional[dict[str, Any]], _replace]]
    agentState: NotRequired[Annotated[_AgentUiState, _replace]]


class IdeaLensStateMiddleware(AgentMiddleware[IdeaLensCanvasState, Any]):  # type: ignore[type-arg]
    """Registers IdeaLens workspace schema on the compiled graph."""

    state_schema = IdeaLensCanvasState
