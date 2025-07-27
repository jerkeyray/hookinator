import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Copy,
  ArrowRight,
  Activity,
  Calendar,
  Globe,
  Trash2,
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteWebhook } from "@/lib/api";
import { useSession } from "next-auth/react";
import DeleteWebhookDialog from "./DeleteWebhookDialog";
import { useState } from "react";

export type Webhook = {
  id: string;
  url: string;
  name: string;
  createdAt: string;
  requests: number;
};

export default function WebhookList({
  webhooks,
  onWebhookDeleted,
}: {
  webhooks: Webhook[];
  onWebhookDeleted?: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    webhookId: string;
    webhookName: string;
  }>({
    isOpen: false,
    webhookId: "",
    webhookName: "",
  });

  const handleCopyUrl = async (url: string) => {
    try {
      await copyToClipboard(url);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleInspect = (webhookId: string) => {
    router.push(`/dashboard/inspect/${webhookId}`);
  };

  const handleDeleteClick = (
    webhookId: string,
    webhookName: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setDeleteDialog({
      isOpen: true,
      webhookId,
      webhookName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!session?.backendToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      await deleteWebhook(
        deleteDialog.webhookId,
        session.backendToken as string
      );
      toast.success("Webhook deleted successfully");
      onWebhookDeleted?.();
    } catch (error) {
      toast.error("Failed to delete webhook");
      console.error("Delete error:", error);
      throw error; // Re-throw to let the dialog handle the loading state
    }
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialog({
      isOpen: false,
      webhookId: "",
      webhookName: "",
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header Stats - Fixed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 flex-shrink-0">
        <Card className="border border-gray-800 bg-black">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-400 truncate">
                  Total Endpoints
                </p>
                <p className="text-2xl font-bold text-white">
                  {webhooks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-800 bg-black">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-400 truncate">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-white">
                  {webhooks.reduce((sum, hook) => sum + hook.requests, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-800 bg-black sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-400 truncate">
                  Active Today
                </p>
                <p className="text-2xl font-bold text-white">
                  {webhooks.filter((hook) => hook.requests > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks List - Scrollable */}
      <Card className="border border-gray-800 bg-black flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-gray-800 flex-shrink-0">
          <CardTitle className="text-xl font-bold text-white">
            Your Webhook Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="!p-0 flex-1 overflow-y-auto">
          {webhooks.map((hook: Webhook) => (
            <div
              key={hook.id}
              className="flex items-center justify-between p-6 border-b border-gray-800 hover:bg-gray-900/50 transition-colors cursor-pointer group last:border-b-0"
              onClick={() => handleInspect(hook.id)}
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* Icon */}
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-sm font-medium text-white truncate">
                      {hook.name || `Webhook ${hook.id.slice(0, 8)}`}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Activity className="h-3 w-3" />
                      <span>
                        {hook.requests}{" "}
                        {hook.requests === 1 ? "request" : "requests"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Stats */}
              <div className="flex items-center space-x-4 text-right">
                <div className="text-xs text-gray-400">
                  <div className="flex items-center space-x-1 mb-1">
                    <Activity className="h-3 w-3" />
                    <span>
                      {hook.requests > 0
                        ? `${(hook.requests / 24).toFixed(2)} requests/hour`
                        : "0.00 requests/hour"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {hook.requests > 0
                        ? `Last request received ${hook.createdAt}`
                        : "No requests received yet"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                    onClick={(e) => {
                      handleDeleteClick(
                        hook.id,
                        hook.name || `Webhook ${hook.id.slice(0, 8)}`,
                        e
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  {/* Copy URL Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyUrl(hook.url);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  {/* Inspect Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInspect(hook.id);
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {webhooks.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No endpoints yet</p>
                <p className="text-sm">
                  Create your first endpoint to start receiving requests
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteWebhookDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
        webhookName={deleteDialog.webhookName}
        webhookId={deleteDialog.webhookId}
      />
    </div>
  );
}
