import type { InterviewScript } from "@/lib/idealens/types";
import { Button } from "@/components/ui/button";
import { Badge } from "./badge-utils";

export function InterviewScriptPanel({ script }: { script: InterviewScript }) {
  const copyAll = () => {
    const lines = script.questions.map((q) => q.question).join("\n\n");
    void navigator.clipboard.writeText(lines);
  };

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{script.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{script.targetPersona}</Badge>
          </div>
          <p className="mt-2 text-sm text-gray-600">{script.goal}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={copyAll}>
          Copy all questions
        </Button>
      </div>
      <div className="space-y-4">
        {script.questions.map((q) => (
          <div key={q.id} className="rounded-lg border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900">{q.question}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-1">
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Purpose
                </p>
                <p className="text-sm text-gray-600">{q.purpose}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Good signal
                </p>
                <p className="text-sm text-green-700">{q.goodSignal}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">
                  Red flag
                </p>
                <p className="text-sm text-red-700">{q.redFlag}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
