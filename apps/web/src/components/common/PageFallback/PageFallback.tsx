export default function PageFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl border border-border/80 bg-muted" />
      <div className="h-64 rounded-2xl border border-border/80 bg-muted" />
      <div className="h-48 rounded-2xl border border-border/80 bg-muted" />
    </div>
  );
}
