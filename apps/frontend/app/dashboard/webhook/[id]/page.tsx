"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Copy, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type WebhookRequest = {
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: string;
};

export default function WebhookInspectPage() {
  const params = useParams();
  const router = useRouter();
  const webhookId = params.id as string;

  const [requests, setRequests] = useState<WebhookRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchWebhookRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get JWT token
      const tokenResponse = await fetch("/api/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get authentication token");
      }
      const { token } = await tokenResponse.json();

      // Fetch webhook requests
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/webhooks/${webhookId}/requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to view this webhook");
        }
        throw new Error("Failed to fetch webhook requests");
      }

      const data = await response.json();
      setRequests(data || []);

      // Set the webhook URL
      setWebhookUrl(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/webhook/${webhookId}`
      );
    } catch (err) {
      console.error("Error fetching webhook requests:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  useEffect(() => {
    if (webhookId) {
      fetchWebhookRequests();
    }
  }, [webhookId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Loading webhook requests...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 mb-4">Error: {error}</p>
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Webhook Inspector</h1>
          <Button onClick={fetchWebhookRequests} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Webhook URL Card */}
        <Card className="border-gray-800 bg-black shadow-lg shadow-white/5 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Webhook Endpoint
            </CardTitle>
            <CardDescription>
              Send HTTP requests to this URL to test your webhook
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm bg-gray-900 p-3 rounded-md flex items-center justify-between">
              <span className="text-blue-400">{webhookUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyWebhookUrl}
                className="ml-2"
              >
                <Copy
                  className={`h-4 w-4 ${copiedUrl ? "text-green-400" : "text-gray-400"}`}
                />
              </Button>
            </div>
            {copiedUrl && (
              <p className="text-xs text-green-400 mt-2">
                Copied to clipboard!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="border-gray-800 bg-black shadow-lg shadow-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Webhook Requests ({requests.length})
            </CardTitle>
            <CardDescription>
              View all HTTP requests sent to this webhook endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-2">No requests received yet</p>
                <p className="text-sm text-gray-500">
                  Send a POST request to your webhook URL to see it appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Headers</TableHead>
                    <TableHead>Body Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request, index) => (
                    <TableRow key={index} className="border-gray-800">
                      <TableCell>
                        <div className="text-sm">
                          {new Date(request.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 text-xs font-mono bg-blue-900/20 text-blue-400 rounded">
                          {request.method}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono bg-gray-900 p-2 rounded max-w-xs">
                          <details>
                            <summary className="cursor-pointer text-gray-400">
                              {Object.keys(request.headers).length} headers
                            </summary>
                            <div className="mt-2 space-y-1">
                              {Object.entries(request.headers).map(
                                ([key, value]) => (
                                  <div key={key} className="text-gray-300">
                                    <span className="text-blue-400">
                                      {key}:
                                    </span>{" "}
                                    {value}
                                  </div>
                                )
                              )}
                            </div>
                          </details>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono bg-gray-900 p-2 rounded max-w-md">
                          <div className="truncate">
                            {request.body || (
                              <span className="text-gray-500">(empty)</span>
                            )}
                          </div>
                          {request.body && request.body.length > 50 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-gray-400">
                                Show full body
                              </summary>
                              <pre className="mt-2 whitespace-pre-wrap text-gray-300">
                                {request.body}
                              </pre>
                            </details>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
