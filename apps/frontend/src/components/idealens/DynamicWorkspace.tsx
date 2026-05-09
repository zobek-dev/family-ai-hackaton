import type { ComponentType } from "react";
import type { ComponentDescriptor } from "@/lib/idealens/types";
import { componentRegistry } from "@/lib/idealens/componentRegistry";

export function DynamicWorkspace({
  components,
}: {
  components: ComponentDescriptor[];
}) {
  return (
    <div className="space-y-5">
      {components.map((descriptor) => {
        const Component = componentRegistry[descriptor.type] as ComponentType<
          Record<string, unknown>
        >;
        if (!Component) return null;
        return (
          <Component
            key={descriptor.id}
            {...descriptor.props}
          />
        );
      })}
    </div>
  );
}
