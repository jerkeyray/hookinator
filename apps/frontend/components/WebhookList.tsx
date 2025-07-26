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
  name: string;
  createdAt: string;
  requests: number;
};

export default function WebhookList({ webhooks }: { webhooks: Webhook[] }) {
  const router = useRouter();

  const handleCopyUrl = async (url: string) => {
    try {
      await copyToClipboard(url);
      toast.success("Copied to clipboard!");
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="border border-gray-800 bg-black">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center space-x-3">
              <Globe className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-400 truncate">
                  Total Webhooks
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

      {/* Webhooks Table */}
      <Card className="border border-gray-800 bg-black">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-xl font-bold text-white">
            Your Webhook Endpoints
          </CardTitle>
          <CardDescription className="text-gray-400">
            Manage your webhook endpoints and inspect their incoming requests
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-300 font-medium px-4 py-3 text-left">
                    Name
                  </TableHead>
                  <TableHead className="text-gray-300 font-medium px-4 py-3 text-left">
                    Endpoint URL
                  </TableHead>
                  <TableHead className="text-gray-300 font-medium px-4 py-3 text-left hidden lg:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-gray-300 font-medium px-4 py-3 text-center hidden sm:table-cell">
                    Requests
                  </TableHead>
                  <TableHead className="text-gray-300 font-medium px-4 py-3 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((hook: Webhook) => (
                  <TableRow
                    key={hook.id}
                    className="border-gray-800 hover:bg-transparent"
                  >
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {hook.name || `Webhook ${hook.id.slice(0, 8)}`}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                            <span className="text-black truncate">
                              {hook.url}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-gray-100 flex-shrink-0"
                              onClick={() => handleCopyUrl(hook.url)}
                            >
                              <Copy className="h-4 w-4 text-gray-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-4 py-4 text-gray-300">
                      <span className="truncate block">{hook.createdAt}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            hook.requests > 0
                              ? "bg-gray-800 text-gray-300 border border-gray-700"
                              : "bg-gray-900 text-gray-500 border border-gray-800"
                          }`}
                        >
                          {hook.requests}{" "}
                          {hook.requests === 1 ? "request" : "requests"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-black bg-white"
                        onClick={() => handleInspect(hook.id)}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Inspect</span>
                        <ArrowRight className="h-4 w-4 sm:ml-2" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
