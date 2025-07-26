"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWebhookRequests } from "@/lib/api";
import { WebhookRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils";
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
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  useEffect(() => {
    const fetchRequests = async () => {
      if (status === "authenticated" && session?.backendToken) {
        try {
          const data = await getWebhookRequests(
            webhookId,
            session.backendToken as string
          );
          setRequests(data);
          if (data.length > 0) {
            setSelectedRequest(data[0]);
          }
        } catch (error) {
          console.error("Failed to fetch webhook requests:", error);
          toast.error("Failed to load webhook requests");
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === "authenticated") {
      fetchRequests();
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

  const handleDownloadBody = (body: string, index: number) => {
    const blob = new Blob([body], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook-request-${index + 1}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-purple-900 to-blue-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-300">Aditya Srivastava</span>
              <ChevronLeft className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">Webhook</span>
              <ChevronLeft className="h-4 w-4 text-gray-400" />
              <span className="text-white font-medium">Source</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-gray-800 bg-gray-900 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
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
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                Search
              </Button>
            </div>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto">
            {requests.map((request, index) => (
              <div
                key={index}
                className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors ${
                  selectedRequest === request ? "bg-gray-800" : ""
                }`}
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-300">
                      Unknown Event
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-gray-400">
                      {getTimeAgo(request.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  POST {request.method || "POST"} {process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8080'}
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
                  <h1 className="text-2xl font-bold">Unknown Event</h1>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
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

                {/* Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="bg-gray-800 border border-gray-700">
                    <TabsTrigger
                      value="summary"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      Summary
                    </TabsTrigger>
                    <TabsTrigger
                      value="request"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      Request
                    </TabsTrigger>
                    <TabsTrigger
                      value="response"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      Response
                    </TabsTrigger>
                    <TabsTrigger
                      value="destinations"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      Destinations
                    </TabsTrigger>
                    <TabsTrigger
                      value="workflow"
                      className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                    >
                      Workflow
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Request Box */}
                      <Card className="border-gray-700 bg-gray-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-blue-400">
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
                            <span className="text-green-400 font-medium">
                              POST
                            </span>{" "}
                            octo.hk
                          </div>
                          <div className="text-sm text-gray-300">
                            /{webhookId}
                          </div>
                          <div className="bg-gray-900 p-3 rounded-md">
                            <pre className="text-xs text-gray-300 overflow-x-auto">
                              {selectedRequest.body || "No body"}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Response Box */}
                      <Card className="border-gray-700 bg-gray-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-green-400">
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
                          <div className="text-2xl font-bold text-green-400">
                            200 OK
                          </div>
                          <div className="bg-gray-900 p-3 rounded-md">
                            <pre className="text-xs text-gray-300">
                              No content
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Destinations Box */}
                    <Card className="border-gray-700 bg-gray-800 mt-6">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-blue-400">
                          DESTINATIONS
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-gray-400">
                          <p>
                            There was no destination set up when we received
                            this webhook.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="request" className="mt-6">
                    <Card className="border-gray-700 bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Request Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Headers</h4>
                          <div className="bg-gray-900 p-4 rounded-md">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(selectedRequest.headers, null, 2)}
                            </pre>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Body</h4>
                          <div className="bg-gray-900 p-4 rounded-md">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                              {selectedRequest.body || "No body"}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="response" className="mt-6">
                    <Card className="border-gray-700 bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg">
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
                    <Card className="border-gray-700 bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg">Destinations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-gray-400">
                          <p>No destinations configured</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="workflow" className="mt-6">
                    <Card className="border-gray-700 bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-lg">Workflow</CardTitle>
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
  );
}
