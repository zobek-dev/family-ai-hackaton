import type { Experiment } from "./types";

export function mergeNewExperiments(
  current: Experiment[],
  incoming: Experiment[],
): Experiment[] {
  const existingIds = new Set(current.map((e) => e.id));
  return [...incoming.filter((e) => !existingIds.has(e.id)), ...current];
}
