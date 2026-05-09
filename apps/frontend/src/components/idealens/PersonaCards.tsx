import type { Persona } from "@/lib/idealens/types";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge-utils";

export function PersonaCards({
  personas,
  selectedPersonaId,
  onSelectICP,
}: {
  personas: Persona[];
  selectedPersonaId: string | null;
  onSelectICP: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Personas</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {personas.map((p) => {
          const selected = selectedPersonaId === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 transition-colors ${
                selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
              }`}
            >
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge value={p.painIntensity}>{p.painIntensity} pain</Badge>
                <Badge value={p.budgetLevel}>{p.budgetLevel} budget</Badge>
                <Badge value={p.urgency}>{p.urgency} urgency</Badge>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{p.description}</p>
              <p className="mt-2 text-xs font-medium uppercase text-gray-400">
                Acquisition
              </p>
              <p className="text-sm text-gray-600">{p.acquisitionChannel}</p>
              <p className="mt-2 text-xs font-medium uppercase text-gray-400">
                Objections
              </p>
              <ul className="list-inside list-disc text-sm text-gray-600">
                {p.objections.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "secondary"}
                  onClick={() => onSelectICP(p.id)}
                >
                  Select as ICP
                </Button>
                <Button type="button" size="sm" variant="outline" disabled>
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
