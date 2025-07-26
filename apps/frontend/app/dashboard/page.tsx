"use client";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import WebhookList, { Webhook } from "@/components/WebhookList";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getWebhooks, getWebhookRequests } from "@/lib/api";
import { redirect } from "next/navigation";
import { ApiWebhook } from "@/lib/types";
import { CreateWebhookDialog as CreateSourceDialog } from "./components/CreateWebhookDialog";
import { useCallback } from "react";
import { generateWebhookUrl, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [userWebhooks, setUserWebhooks] = useState<Webhook[]>([]);

  const fetchWebhooks = useCallback(async () => {
    if (status === "authenticated" && session?.backendToken) {
      try {
        const apiWebhooks: ApiWebhook[] = await getWebhooks(
          session.backendToken as string
        );

        // Fetch request counts for each webhook
        const webhooksWithRequests = await Promise.all(
          apiWebhooks.map(async (hook) => {
            try {
              const requests = await getWebhookRequests(
                hook.id,
                session.backendToken as string
              );
              return {
                id: hook.id,
                url: generateWebhookUrl(hook.id),
                createdAt: formatDate(hook.created_at),
                requests: requests.length,
              };
            } catch (error) {
              console.error(
                `Failed to fetch requests for webhook ${hook.id}:`,
                error
              );
              return {
                id: hook.id,
                url: generateWebhookUrl(hook.id),
                createdAt: formatDate(hook.created_at),
                requests: 0,
              };
            }
          })
        );

        setUserWebhooks(webhooksWithRequests);
      } catch (error) {
        console.error("Failed to fetch webhooks:", error);
        setUserWebhooks([]);
      }
    }
  }, [session, status]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const userImage =
    session?.user?.image ||
    "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36";

  // --- Route Protection ---
  // If the user is not authenticated, redirect them to the sign-in page.
  if (status === "unauthenticated") {
    redirect("/sign-in");
  }

  // --- Loading State ---
  // Show a simple loading message while the session status is being determined.
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] bg-black text-white">
      <Sidebar />
      <div className="flex flex-col">
        <DashboardHeader userImage={userImage} />
        <main className="flex flex-1 flex-col gap-6 p-6 lg:gap-8 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl text-white">
                Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Manage your webhook endpoints
              </p>
            </div>
            <CreateSourceDialog onWebhookCreated={fetchWebhooks} />
          </div>
          {/* Render webhooks list */}
          <WebhookList webhooks={userWebhooks} />
        </main>
      </div>
    </div>
  );
}
