import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
  onCreateWebhook?: () => void;
}

export default function EmptyState({ onCreateWebhook }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-800 shadow-lg shadow-white/5">
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-2xl font-bold tracking-tight">
          You have no webhooks yet
        </h3>
        <p className="text-sm text-gray-400">
          Get started by creating your first webhook endpoint.
        </p>
        <Button
          className="mt-4 bg-white text-black hover:bg-gray-200"
          onClick={onCreateWebhook}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </div>
    </div>
  );
}
