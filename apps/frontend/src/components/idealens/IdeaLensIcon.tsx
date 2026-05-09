import type { CSSProperties } from "react";

export type IdeaLensIconName =
  | "il-lens"
  | "il-spark"
  | "il-target"
  | "il-personas"
  | "il-map"
  | "il-experiment"
  | "il-score"
  | "il-tool"
  | "il-activity"
  | "il-warning"
  | "il-check"
  | "il-close"
  | "il-plus"
  | "il-refresh"
  | "il-edit"
  | "il-chevron-down"
  | "il-rocket";

export function IdeaLensIcon({
  name,
  size = 18,
  className,
  style,
  title,
}: {
  name: IdeaLensIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      className={`il-icon ${className ?? ""}`.trim()}
      width={size}
      height={size}
      style={style}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <use href={`/idealens/idealens-icons.svg#${name}`} />
    </svg>
  );
}
