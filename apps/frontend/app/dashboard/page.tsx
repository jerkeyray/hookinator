"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import WebhookList, { Webhook } from "@/components/WebhookList";
import EmptyState from "@/components/EmptyState";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Define type for backend webhook data
type BackendWebhook = {
  id: string;
  webhook_url: string;
  forward_url: string;
  created_at: string;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [forwardUrl, setForwardUrl] = useState("");

  const userImage =
    session?.user?.image ||
    "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36";

  // Function to fetch webhooks from the backend
  const fetchWebhooks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, get the JWT token
      const tokenResponse = await fetch("/api/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get authentication token");
      }
      const { token } = await tokenResponse.json();

      // Check if backend URL is configured
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("Backend URL not configured. Please set NEXT_PUBLIC_BACKEND_URL environment variable.");
      }

      console.log("Fetching webhooks from:", `${backendUrl}/api/v1/webhooks`);

      // Then, fetch webhooks from the backend
      const webhooksResponse = await fetch(
        `${backendUrl}/api/v1/webhooks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Webhooks response status:", webhooksResponse.status);

      if (!webhooksResponse.ok) {
        const errorText = await webhooksResponse.text();
        console.error("Backend error response:", errorText);
        throw new Error(`Failed to fetch webhooks: ${webhooksResponse.status} - ${errorText}`);
      }

      const backendWebhooks: BackendWebhook[] = await webhooksResponse.json();

      // Transform backend data to match the frontend Webhook interface
      const transformedWebhooks: Webhook[] = backendWebhooks.map(
        (webhook: BackendWebhook) => ({
          id: webhook.id,
          url: webhook.webhook_url,
          createdAt: new Date(webhook.created_at).toLocaleDateString(),
          requests: 0, // You might want to fetch this separately or add it to the backend response
        })
      );

      setWebhooks(transformedWebhooks);
    } catch (err) {
      console.error("Error fetching webhooks:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Function to create a new webhook
  const createWebhook = async () => {
    try {
      setIsCreating(true);

      // Get the JWT token
      const tokenResponse = await fetch("/api/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get authentication token");
      }
      const { token } = await tokenResponse.json();

      // Check if backend URL is configured
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("Backend URL not configured. Please set NEXT_PUBLIC_BACKEND_URL environment variable.");
      }

      // Create the webhook
      const createResponse = await fetch(
        `${backendUrl}/api/v1/webhooks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            forward_url: forwardUrl.trim() || "",
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Create webhook error:", errorText);
        throw new Error(`Failed to create webhook: ${createResponse.status} - ${errorText}`);
      }

      // Reset form and close dialog
      setForwardUrl("");
      setIsCreateDialogOpen(false);

      // Refresh the webhook list
      await fetchWebhooks();
    } catch (error) {
      console.error("Error creating webhook:", error);
      alert("Failed to create webhook. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch webhooks when component mounts
  useEffect(() => {
    if (session) {
      fetchWebhooks();
    }
  }, [session]);

  if (isLoading) {
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] bg-black text-white">
        <Sidebar />
        <div className="flex flex-col">
          <DashboardHeader userImage={userImage} />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Loading webhooks...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] bg-black text-white">
        <Sidebar />
        <div className="flex flex-col">
          <DashboardHeader userImage={userImage} />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-center h-64">
              <p className="text-red-400">Error: {error}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] bg-black text-white">
      <Sidebar />
      <div className="flex flex-col">
        <DashboardHeader userImage={userImage} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold md:text-2xl">My Webhooks</h1>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-gray-200">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-black border-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle>Create New Webhook</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Create a new webhook endpoint to receive HTTP requests. You
                    can optionally set a forward URL to automatically relay
                    requests to your server.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="forward-url"
                      className="text-sm font-medium"
                    >
                      Forward URL (Optional)
                    </Label>
                    <Input
                      id="forward-url"
                      placeholder="https://your-server.com/webhook"
                      value={forwardUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForwardUrl(e.target.value)
                      }
                      className="bg-gray-900 border-gray-700 text-white placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-500">
                      If provided, all requests will be forwarded to this URL
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createWebhook}
                    disabled={isCreating}
                    className="bg-white text-black hover:bg-gray-200"
                  >
                    {isCreating ? "Creating..." : "Create Webhook"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {webhooks.length > 0 ? (
            <WebhookList webhooks={webhooks} />
          ) : (
            <EmptyState onCreateWebhook={fetchWebhooks} />
          )}
        </main>
      </div>
    </div>
  );
}
