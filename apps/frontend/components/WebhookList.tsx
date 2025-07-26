import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, ArrowRight, Activity, Calendar, Globe } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type Webhook = {
  id: string;
  url: string;
  createdAt: string;
  requests: number;
};

export default function WebhookList({ webhooks }: { webhooks: Webhook[] }) {
  const router = useRouter();

  const handleCopyUrl = async (url: string) => {
    try {
      await copyToClipboard(url);
      toast.success("Webhook URL copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleInspect = (webhookId: string) => {
    router.push(`/dashboard/inspect/${webhookId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-black">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Webhooks
                </p>
                <p className="text-2xl font-bold text-white">
                  {webhooks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-black">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-white">
                  {webhooks.reduce((sum, hook) => sum + hook.requests, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-black">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-gray-400">
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

      {/* Webhooks Table */}
      <Card className="border-gray-800 bg-gradient-to-br from-gray-900 to-black shadow-xl">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-xl font-bold text-white">
            Your Webhook Endpoints
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage your webhook endpoints and inspect their incoming requests
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-gray-800/50">
                <TableHead className="text-gray-300 font-medium">
                  Endpoint URL
                </TableHead>
                <TableHead className="text-gray-300 font-medium hidden md:table-cell">
                  Created
                </TableHead>
                <TableHead className="text-gray-300 font-medium text-center hidden md:table-cell">
                  Requests
                </TableHead>
                <TableHead className="text-gray-300 font-medium text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((hook: Webhook) => (
                <TableRow
                  key={hook.id}
                  className="border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-mono text-sm bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center justify-between">
                          <span className="text-gray-200 truncate">
                            {hook.url}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 hover:bg-gray-700"
                            onClick={() => handleCopyUrl(hook.url)}
                          >
                            <Copy className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-gray-300">
                    {hook.createdAt}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <div className="flex items-center justify-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          hook.requests > 0
                            ? "bg-green-900/20 text-green-400 border border-green-500/20"
                            : "bg-gray-800 text-gray-400 border border-gray-700"
                        }`}
                      >
                        {hook.requests}{" "}
                        {hook.requests === 1 ? "request" : "requests"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 hover:bg-gray-800 hover:border-gray-500 text-gray-200"
                      onClick={() => handleInspect(hook.id)}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Inspect
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {webhooks.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No webhooks yet</p>
                <p className="text-sm">
                  Create your first webhook to start receiving requests
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
