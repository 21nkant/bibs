export default function Loading() {
  return (
    <div aria-busy className="animate-pulse pt-4">
      <div className="h-4 w-24 rounded-full bg-night-raised" />
      <div className="mt-2 h-8 w-48 rounded-lg bg-night-raised" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-night-raised" />
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-44 rounded-2xl border border-night-line bg-night-raised/60" />
        ))}
      </div>
    </div>
  );
}
