"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWebhookRequests, getWebhook } from "@/lib/api";
import { WebhookRequest } from "@/lib/types";
import { formatDate, generateWebhookUrl, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Copy,
  Download,
  Clock,
  MoreHorizontal,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "../../components/Sidebar";

export default function WebhookInspectPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const webhookId = params.id as string;
  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("summary");
  const [webhook, setWebhook] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated" && session?.backendToken) {
        try {
          // Fetch webhook details and requests in parallel
          const [webhookData, requestsData] = await Promise.all([
            getWebhook(webhookId, session.backendToken as string),
            getWebhookRequests(webhookId, session.backendToken as string),
          ]);
          
          setWebhook(webhookData);
          setRequests(requestsData);
          if (requestsData.length > 0) {
            setSelectedRequest(requestsData[0]);
          }
        } catch (error) {
          console.error("Failed to fetch webhook data:", error);
          toast.error("Failed to load webhook data");
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
  }, [webhookId, session, status]);

  const handleCopyBody = async (body: string) => {
    try {
      await copyToClipboard(body);
      toast.success("Request body copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy request body");
    }
  };

  const handleCopyWebhookUrl = async () => {
    const webhookUrl = generateWebhookUrl(webhookId);
    try {
      await copyToClipboard(webhookUrl);
      toast.success("Webhook URL copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy webhook URL");
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const requestTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - requestTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  const webhookUrl = generateWebhookUrl(webhookId);
  const sourceName = webhook?.name || `Webhook ${webhookId.slice(0, 8)}`;
  const userImage =
    session?.user?.image ||
    "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36";
  const userName = session?.user?.name || "User";

  return (
    <div className="flex min-h-screen w-full bg-black text-white">
      <Sidebar userImage={userImage} userName={userName} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex h-16 items-center gap-4 border-b border-gray-800 bg-black px-4 lg:px-6">
          <div className="w-full flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="flex h-screen">
          {/* Left Sidebar */}
          <div className="w-80 border-r border-gray-800 bg-black flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-300">
                  Realtime
                </span>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Newer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  Older
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto">
              {requests.map((request, index) => (
                <div
                  key={index}
                  className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${
                    selectedRequest === request ? "bg-blue-700" : ""
                  }`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-300">
                        {sourceName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {getTimeAgo(request.timestamp)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    POST{" "}
                    {process.env.NEXT_PUBLIC_API_URL?.replace(
                      /^https?:\/\//,
                      ""
                    ) || "localhost:8080"}
                  </div>
                </div>
              ))}
              {requests.length === 0 && !loading && (
                <div className="p-8 text-center text-gray-400">
                  <p>No requests received yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {selectedRequest ? (
              <>
                {/* Content Header */}
                <div className="p-6 border-b border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-white">
                      {sourceName}
                    </h1>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Webhook URL Display */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-300 mb-1">
                          Webhook URL
                        </p>
                        <p className="text-sm font-mono text-white break-all">
                          {webhookUrl}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyWebhookUrl}
                        className="ml-4 text-gray-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="bg-gray-900 border border-gray-700">
                      <TabsTrigger
                        value="summary"
                        className="data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                      >
                        Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="request"
                        className="data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                      >
                        Request
                      </TabsTrigger>
                      <TabsTrigger
                        value="response"
                        className="data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                      >
                        Response
                      </TabsTrigger>
                      <TabsTrigger
                        value="destinations"
                        className="data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                      >
                        Destinations
                      </TabsTrigger>
                      <TabsTrigger
                        value="workflow"
                        className="data-[state=active]:bg-blue-700 data-[state=active]:text-white"
                      >
                        Workflow
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="mt-6">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Request Box */}
                        <Card className="border-gray-700 bg-gray-900">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium text-blue-500">
                                REQUEST
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopyBody(selectedRequest.body)
                                }
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm">
                              <span className="text-white font-medium">
                                POST
                              </span>{" "}
                              {process.env.NEXT_PUBLIC_API_URL?.replace(
                                /^https?:\/\//,
                                ""
                              ) || "localhost:8080"}
                            </div>
                            <div className="text-sm text-gray-300">
                              /{webhookId}
                            </div>
                            <div className="bg-black p-3 rounded-md border border-gray-700">
                              <pre className="text-xs text-gray-300 overflow-x-auto">
                                {selectedRequest.body || "No body"}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Response Box */}
                        <Card className="border-gray-700 bg-gray-900">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium text-blue-500">
                                RESPONSE
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-2xl font-bold text-white">
                              200 OK
                            </div>
                            <div className="bg-black p-3 rounded-md border border-gray-700">
                              <pre className="text-xs text-gray-300">
                                No content
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Destinations Box */}
                      <Card className="border-gray-700 bg-gray-900 mt-6">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-blue-500">
                            DESTINATIONS
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-gray-400 bg-black rounded-lg border border-gray-700">
                            <p>
                              There was no destination set up when we received
                              this webhook.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="request" className="mt-6">
                      <Card className="border-gray-700 bg-gray-900">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Request Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-white">
                              Headers
                            </h4>
                            <div className="bg-black p-4 rounded-md border border-gray-700">
                              <pre className="text-xs overflow-x-auto text-gray-300">
                                {JSON.stringify(
                                  selectedRequest.headers,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 text-white">
                              Body
                            </h4>
                            <div className="bg-black p-4 rounded-md border border-gray-700">
                              <pre className="text-xs overflow-x-auto whitespace-pre-wrap text-gray-300">
                                {selectedRequest.body || "No body"}
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="response" className="mt-6">
                      <Card className="border-gray-700 bg-gray-900">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Response Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-gray-400">
                            <p>No response data available</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="destinations" className="mt-6">
                      <Card className="border-gray-700 bg-gray-900">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Destinations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-gray-400">
                            <p>No destinations configured</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="workflow" className="mt-6">
                      <Card className="border-gray-700 bg-gray-900">
                        <CardHeader>
                          <CardTitle className="text-lg text-white">
                            Workflow
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-gray-400">
                            <p>No workflow configured</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p>Select a request to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
