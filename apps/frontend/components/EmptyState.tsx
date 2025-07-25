import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

interface EmptyStateProps {
  onCreateWebhook: () => Promise<void>;
}

export default function EmptyState({ onCreateWebhook }: EmptyStateProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateWebhook = async () => {
    try {
      setIsCreating(true);

      // Get the JWT token
      const tokenResponse = await fetch("/api/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get authentication token");
      }
      const { token } = await tokenResponse.json();

      // Create the webhook
      const createResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/webhooks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            forward_url: "", // Empty forward URL for now
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create webhook");
      }

      // Refresh the webhook list
      await onCreateWebhook();
    } catch (error) {
      console.error("Error creating webhook:", error);
      alert("Failed to create webhook. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

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
          onClick={handleCreateWebhook}
          disabled={isCreating}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          {isCreating ? "Creating..." : "Create Webhook"}
        </Button>
      </div>
    </div>
  );
}
