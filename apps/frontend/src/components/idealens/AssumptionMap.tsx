import type { Assumption } from "@/lib/idealens/types";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge-utils";

export function AssumptionMap({
  assumptions,
  onMarkRisky,
  onMarkValidated,
  onMarkInvalidated,
}: {
  assumptions: Assumption[];
  onMarkRisky: (id: string) => void;
  onMarkValidated: (id: string) => void;
  onMarkInvalidated: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Assumptions</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase text-gray-400">
              <th className="pb-2 pr-4">Assumption</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4">Importance</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Test method</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assumptions.map((a) => (
              <tr key={a.id} className="border-b border-gray-100">
                <td className="py-3 pr-4 align-top text-gray-700">{a.text}</td>
                <td className="py-3 pr-4 align-top">
                  <Badge value={a.category}>{a.category}</Badge>
                </td>
                <td className="py-3 pr-4 align-top">
                  <Badge value={a.importance}>{a.importance}</Badge>
                </td>
                <td className="py-3 pr-4 align-top">
                  <Badge value={a.status}>{a.status}</Badge>
                </td>
                <td className="py-3 pr-4 align-top text-gray-600">{a.testMethod}</td>
                <td className="py-3 align-top">
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => onMarkRisky(a.id)}
                    >
                      Mark risky
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => onMarkValidated(a.id)}
                    >
                      Mark validated
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => onMarkInvalidated(a.id)}
                    >
                      Mark invalidated
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
