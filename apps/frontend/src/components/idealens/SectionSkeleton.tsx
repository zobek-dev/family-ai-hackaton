export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3 rounded-xl border bg-white p-5 animate-pulse">
      <div className="h-3 w-24 rounded bg-gray-100 text-xs uppercase">{label}</div>
      <div className="h-4 w-3/4 rounded bg-gray-100" />
      <div className="h-3 w-full rounded bg-gray-100" />
      <div className="h-3 w-1/2 rounded bg-gray-100" />
    </div>
  );
}
