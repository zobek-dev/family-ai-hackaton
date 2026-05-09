import type { Experiment } from "@/lib/idealens/types";
import { Badge } from "./badge-utils";

export function ExperimentList({ experiments }: { experiments: Experiment[] }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Experiments</h2>
      <div className="space-y-4">
        {experiments.map((e) => (
          <div key={e.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge value={e.effort}>{e.effort} effort</Badge>
              <Badge value={e.cost}>{e.cost} cost</Badge>
              <Badge value={e.status}>{e.status}</Badge>
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {e.duration}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">{e.title}</h3>
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium uppercase text-gray-400">
                Hypothesis
              </p>
              <p className="text-sm text-gray-600">{e.hypothesis}</p>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium uppercase text-gray-400">Method</p>
              <p className="text-sm text-gray-600">{e.method}</p>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium uppercase text-gray-400">
                Success metric
              </p>
              <p className="text-sm text-gray-600">{e.successMetric}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
