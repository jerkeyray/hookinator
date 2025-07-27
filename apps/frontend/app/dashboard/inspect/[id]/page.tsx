// Drop-in replacement with revamped UI and original logic
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getWebhookRequests, getWebhook } from "@/lib/api";
import { WebhookRequest } from "@/lib/types";
import { generateWebhookUrl, copyToClipboard } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Circle,
  Zap,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "../../components/Sidebar";
import { Badge } from "@/components/ui/badge";

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
  const [webhook, setWebhook] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated" && session?.backendToken) {
        try {
          setLoading(true);
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

  const handleCopy = (text: string, message: string) => {
    copyToClipboard(text)
      .then(() => toast.success(message))
      .catch(() => toast.error("Failed to copy"));
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading Inspector...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  const webhookUrl = generateWebhookUrl(webhookId);
  const sourceName = webhook?.name || "Webhook";

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden">
      <div className="fixed left-0 top-0 bottom-0 z-20">
        <Sidebar
          userImage={
            session?.user?.image ||
            "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36"
          }
          userName={session?.user?.name || "User"}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 ml-64 h-full">
        {/* Header - Always shown - Full width */}
        <div className="px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-white">{sourceName}</h1>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-900 rounded-md border border-gray-700">
            <p className="text-sm font-mono text-gray-300 break-all">
              {webhookUrl}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(webhookUrl, "Webhook URL copied!")}
              className="ml-4 text-gray-400 hover:text-gray-200"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 h-full overflow-hidden">
          {/* Left Column for Events */}
          <aside className="w-80 border-r border-gray-800 flex flex-col bg-[#09090b] h-full">
            <div className="flex-1 overflow-y-auto">
              {requests.length > 0 ? (
                requests.map((request, index) => {
                  const statusCode = 200;
                  const StatusIcon =
                    statusCode >= 500
                      ? XCircle
                      : statusCode >= 400
                        ? AlertCircle
                        : statusCode >= 200
                          ? CheckCircle
                          : Circle;
                  const statusColor =
                    statusCode >= 500
                      ? "text-red-500"
                      : statusCode >= 400
                        ? "text-yellow-500"
                        : statusCode >= 200
                          ? "text-green-500"
                          : "text-gray-400";

                  const isSelected = selectedRequest === request;
                  const requestItemClass = `p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900/70 transition-colors flex flex-col ${
                    isSelected
                      ? "bg-blue-600/10 border-l-4 border-l-blue-500"
                      : "border-l-4 border-transparent"
                  }`;

                  return (
                    <div
                      key={index}
                      className={requestItemClass}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <StatusIcon
                            className={`h-4 w-4 shrink-0 ${statusColor}`}
                          />
                          <span className="text-sm font-medium text-white">
                            {request.method}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(request.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 pl-7 truncate">
                        ID: {`req_${index.toString().padStart(4, "0")}`}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-sm text-gray-500">
                  <p>No requests received yet.</p>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {requests.length === 0 ? (
                // Empty state when no requests
                <div className="flex-1 flex items-center justify-center py-16">
                  <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Zap className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Waiting for requests
                    </h3>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                      Your webhook endpoint is ready to receive requests. Send a
                      test request to the URL above to see it appear here.
                    </p>
                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <p className="text-sm text-gray-300 mb-2">
                        Example request:
                      </p>
                      <code className="text-xs text-green-400 font-mono">
                        {`curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '{"test": "data"}'`}
                      </code>
                    </div>
                  </div>
                </div>
              ) : selectedRequest ? (
                // Show tabs when a request is selected
                <div className="px-6 py-4">
                  <Tabs defaultValue="summary" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-700 p-1.5 rounded-lg h-14 gap-1">
                      <TabsTrigger
                        value="summary"
                        className="px-6 text-sm font-medium transition-all duration-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white text-gray-300 hover:text-white hover:bg-gray-800 rounded-md data-[state=active]:border data-[state=active]:border-blue-700"
                      >
                        Summary
                      </TabsTrigger>
                      <TabsTrigger
                        value="request"
                        className="px-6 text-sm font-medium transition-all duration-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white text-gray-300 hover:text-white hover:bg-gray-800 rounded-md data-[state=active]:border data-[state=active]:border-blue-700"
                      >
                        Request
                      </TabsTrigger>
                      <TabsTrigger
                        value="response"
                        className="px-6 text-sm font-medium transition-all duration-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white text-gray-300 hover:text-white hover:bg-gray-800 rounded-md data-[state=active]:border data-[state=active]:border-blue-700"
                      >
                        Response
                      </TabsTrigger>
                      <TabsTrigger
                        value="destinations"
                        className="px-6 text-sm font-medium transition-all duration-200 data-[state=active]:bg-blue-900 data-[state=active]:text-white text-gray-300 hover:text-white hover:bg-gray-800 rounded-md data-[state=active]:border data-[state=active]:border-blue-700"
                      >
                        Destinations
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="mt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Request Overview Card */}
                        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-gray-900/40 backdrop-blur-sm shadow-xl">
                          <CardHeader className="pb-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-500/20 rounded-lg">
                                <ArrowLeft className="h-5 w-5 text-blue-400 rotate-180" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-semibold text-blue-100">
                                  Request Overview
                                </CardTitle>
                                <p className="text-sm text-blue-300/70 mt-1">
                                  Incoming webhook details
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="flex items-center justify-between py-3 px-4 bg-blue-950/30 rounded-lg border border-blue-500/10">
                              <div className="flex items-center space-x-3">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="text-blue-200 font-medium">
                                  Method
                                </span>
                              </div>
                              <Badge
                                className={
                                  selectedRequest.method === "GET"
                                    ? "bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1 font-semibold"
                                    : selectedRequest.method === "POST"
                                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1 font-semibold"
                                      : selectedRequest.method === "PUT"
                                        ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-3 py-1 font-semibold"
                                        : selectedRequest.method === "DELETE"
                                          ? "bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1 font-semibold"
                                          : "bg-gray-500/20 text-gray-300 border-gray-500/30 px-3 py-1 font-semibold"
                                }
                              >
                                {selectedRequest.method}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between py-3 px-4 bg-blue-950/30 rounded-lg border border-blue-500/10">
                              <div className="flex items-center space-x-3">
                                <Clock className="h-4 w-4 text-blue-400" />
                                <span className="text-blue-200 font-medium">
                                  Received At
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-white text-sm">
                                  {new Date(
                                    selectedRequest.timestamp
                                  ).toLocaleDateString()}
                                </div>
                                <div className="font-mono text-blue-300 text-xs">
                                  {new Date(
                                    selectedRequest.timestamp
                                  ).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-3 px-4 bg-blue-950/30 rounded-lg border border-blue-500/10">
                              <div className="flex items-center space-x-3">
                                <div className="w-4 h-4 border-2 border-blue-400 rounded"></div>
                                <span className="text-blue-200 font-medium">
                                  Body Size
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-white font-semibold">
                                  {selectedRequest.body
                                    ? selectedRequest.body.length.toString()
                                    : "0"}
                                </span>
                                <span className="text-blue-300 text-sm">
                                  bytes
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Response Overview Card */}
                        <Card className="border-green-500/20 bg-gradient-to-br from-green-950/20 to-gray-900/40 backdrop-blur-sm shadow-xl">
                          <CardHeader className="pb-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-green-500/20 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-semibold text-green-100">
                                  Response Overview
                                </CardTitle>
                                <p className="text-sm text-green-300/70 mt-1">
                                  Server response metrics
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-5">
                            <div className="flex items-center justify-between py-3 px-4 bg-green-950/30 rounded-lg border border-green-500/10">
                              <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-green-200 font-medium">
                                  Status Code
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-green-500/30 text-green-200 border-green-500/40 px-3 py-1 font-bold">
                                  200
                                </Badge>
                                <span className="text-green-300 font-medium">
                                  OK
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-3 px-4 bg-green-950/30 rounded-lg border border-green-500/10">
                              <div className="flex items-center space-x-3">
                                <Zap className="h-4 w-4 text-green-400" />
                                <span className="text-green-200 font-medium">
                                  Response Time
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-white font-semibold text-lg">
                                  50
                                </span>
                                <span className="text-green-300 text-sm">
                                  ms
                                </span>
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between py-3 px-4 bg-green-950/30 rounded-lg border border-green-500/10">
                              <div className="flex items-center space-x-3">
                                <Circle className="h-4 w-4 text-green-400" />
                                <span className="text-green-200 font-medium">
                                  Content Type
                                </span>
                              </div>
                              <span className="font-mono text-green-100 text-sm bg-green-950/50 px-2 py-1 rounded">
                                application/json
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Additional Stats Section */}
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-gray-900/40">
                          <CardContent className="p-4 text-center">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Clock className="h-4 w-4 text-purple-400" />
                            </div>
                            <div className="text-lg font-bold text-white mb-1">
                              {new Date(
                                selectedRequest.timestamp
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-xs text-purple-300">
                              Timestamp
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-950/20 to-gray-900/40">
                          <CardContent className="p-4 text-center">
                            <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                              <AlertCircle className="h-4 w-4 text-orange-400" />
                            </div>
                            <div className="text-lg font-bold text-white mb-1">
                              {selectedRequest.headers
                                ? Object.keys(selectedRequest.headers).length
                                : 0}
                            </div>
                            <div className="text-xs text-orange-300">
                              Headers
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-gray-900/40">
                          <CardContent className="p-4 text-center">
                            <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                              <CheckCircle className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div className="text-lg font-bold text-white mb-1">
                              100%
                            </div>
                            <div className="text-xs text-cyan-300">
                              Success Rate
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="request" className="mt-6">
                      <div className="max-w-4xl">
                        {/* Request Card */}
                        <Card className="border-blue-600/30 bg-blue-600/10">
                          <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-blue-400 text-sm font-medium">
                              REQUEST DETAILS
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  JSON.stringify(selectedRequest, null, 2),
                                  "Request data copied!"
                                )
                              }
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-blue-600 text-white border-0">
                                {selectedRequest.method}
                              </Badge>
                              <span className="text-white text-sm">
                                {new URL(webhookUrl).hostname}
                              </span>
                            </div>
                            <div className="text-white text-sm font-mono">
                              {new URL(webhookUrl).pathname}
                            </div>

                            {/* Headers Section */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-blue-300">
                                Headers
                              </h4>
                              <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                                <pre className="text-xs text-white whitespace-pre-wrap">
                                  {selectedRequest.headers ? (
                                    JSON.stringify(
                                      selectedRequest.headers,
                                      null,
                                      2
                                    )
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      No headers
                                    </span>
                                  )}
                                </pre>
                              </div>
                            </div>

                            {/* Body Section */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-blue-300">
                                Body
                              </h4>
                              <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                                <pre className="text-xs text-white whitespace-pre-wrap">
                                  {selectedRequest.body ? (
                                    selectedRequest.body
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      No content
                                    </span>
                                  )}
                                </pre>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="destinations" className="mt-6">
                      <div className="text-center py-12 bg-gray-900 rounded-lg border border-dashed border-gray-700">
                        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Zap className="h-6 w-6 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">
                          Forward Your Webhooks
                        </h3>
                        <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                          Destinations allow you to process and route incoming
                          requests to your own services or third-party APIs.
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Destination
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="response" className="mt-6">
                      <div className="max-w-4xl">
                        {/* Response Card */}
                        <Card className="border-green-600/30 bg-green-600/10">
                          <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-green-400 text-sm font-medium">
                              RESPONSE DETAILS
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  JSON.stringify(
                                    { status: "200 OK", body: "No content" },
                                    null,
                                    2
                                  ),
                                  "Response data copied!"
                                )
                              }
                              className="text-green-400 hover:text-green-300 hover:bg-green-600/20"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Status Code */}
                            <div className="flex items-center space-x-3">
                              <span className="text-green-200 font-medium">
                                Status:
                              </span>
                              <div className="text-2xl font-bold text-black bg-green-400 px-3 py-1 rounded inline-block">
                                200 OK
                              </div>
                            </div>

                            {/* Response Headers */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-green-300">
                                Response Headers
                              </h4>
                              <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                                <pre className="text-xs text-white whitespace-pre-wrap">
                                  {JSON.stringify(
                                    {
                                      "Content-Type": "application/json",
                                      Server: "Hookinator/1.0",
                                      Date: new Date().toUTCString(),
                                      "Content-Length": "0",
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </div>

                            {/* Response Body */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-green-300">
                                Response Body
                              </h4>
                              <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                                <pre className="text-xs text-gray-400 italic">
                                  No content
                                </pre>
                              </div>
                            </div>

                            {/* Response Time */}
                            <div className="flex items-center space-x-3">
                              <span className="text-green-200 font-medium">
                                Response Time:
                              </span>
                              <span className="font-mono text-white font-semibold">
                                50ms
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                // When there are requests but none selected
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <p>Select a request to view details</p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
