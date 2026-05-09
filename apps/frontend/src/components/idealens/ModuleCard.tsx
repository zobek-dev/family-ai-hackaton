import type { ReactNode } from "react";
import { IdeaLensIcon, type IdeaLensIconName } from "./IdeaLensIcon";

export function ModuleCard({
  step,
  title,
  icon,
  actions,
  children,
}: {
  step?: number | string;
  title: string;
  icon?: IdeaLensIconName;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="il-module">
      <div className="il-module-header">
        <h2 className="il-module-title">
          {step !== undefined ? <span className="il-step">{step}</span> : null}
          {icon ? <IdeaLensIcon name={icon} size={14} /> : null}
          <span>{title}</span>
        </h2>
        {actions ? <div className="il-module-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
