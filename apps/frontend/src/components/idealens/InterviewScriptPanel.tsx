import type { InterviewScript } from "@/lib/idealens/types";
import { ModuleCard } from "./ModuleCard";
import { IdeaLensIcon } from "./IdeaLensIcon";

export function InterviewScriptPanel({ script }: { script: InterviewScript }) {
  const copyAll = () => {
    const lines = script.questions.map((q) => q.question).join("\n\n");
    void navigator.clipboard.writeText(lines);
  };

  return (
    <ModuleCard
      step={6}
      title="Interview Script"
      icon="il-tool"
      actions={
        <button type="button" className="il-button" onClick={copyAll}>
          <IdeaLensIcon name="il-tool" size={14} />
          Copy all questions
        </button>
      }
    >
      <div
        className="il-objective"
        style={{ marginBottom: 14, background: "var(--il-color-brand-soft)", borderColor: "var(--il-color-brand)" }}
      >
        <strong style={{ color: "var(--il-color-brand-strong)" }}>{script.title}</strong>
        <p style={{ marginTop: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 850,
              textTransform: "uppercase",
              color: "var(--il-color-muted)",
            }}
          >
            Target persona:&nbsp;
          </span>
          {script.targetPersona}
        </p>
        <p>{script.goal}</p>
      </div>

      <div className="grid gap-3">
        {script.questions.map((q, idx) => (
          <article
            key={q.id}
            className="rounded-md border border-[color:var(--il-color-line)] bg-[color:var(--il-color-surface)] p-3 shadow-[var(--il-shadow-card)]"
          >
            <p className="text-[13px] font-bold text-[color:var(--il-color-ink)]">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--il-color-brand-soft)] text-[10px] font-bold text-[color:var(--il-color-brand-strong)]">
                {idx + 1}
              </span>
              {q.question}
            </p>
            <div className="mt-2 grid gap-1 text-[12px]">
              <p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--il-color-muted)]">
                  Purpose:&nbsp;
                </span>
                <span className="text-[color:var(--il-color-text)]">{q.purpose}</span>
              </p>
              <p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--il-color-muted)]">
                  Good signal:&nbsp;
                </span>
                <span className="text-[color:var(--il-color-success-strong)]">{q.goodSignal}</span>
              </p>
              <p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--il-color-muted)]">
                  Red flag:&nbsp;
                </span>
                <span className="text-[color:var(--il-color-danger)]">{q.redFlag}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </ModuleCard>
  );
}
