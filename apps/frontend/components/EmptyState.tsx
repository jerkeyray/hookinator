export default function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm bg-gray-900/20">
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className="text-2xl font-bold tracking-tight">
          You have no webhooks yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Get started by creating your first webhook endpoint.
        </p>
      </div>
    </div>
  );
}
