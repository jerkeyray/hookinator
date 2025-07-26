"use client";
import Sidebar from "./components/Sidebar";
import DashboardHeader from "./components/DashboardHeader";
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
                name: hook.name,
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
                name: hook.name,
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

  const userName = session?.user?.name || "User";

  // --- Route Protection ---
  if (status === "unauthenticated") {
    redirect("/sign-in");
  }

  // --- Loading State ---
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden">
      <Sidebar userImage={userImage} userName={userName} />
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:p-10 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl xl:text-4xl text-white truncate">
                Dashboard
              </h1>
              <p className="text-gray-400 mt-1 text-sm lg:text-base">
                Manage your webhook endpoints and inspect incoming requests
              </p>
            </div>
            <div className="flex-shrink-0">
              <CreateSourceDialog onWebhookCreated={fetchWebhooks} />
            </div>
          </div>
          {/* Render webhooks list */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <WebhookList webhooks={userWebhooks} />
          </div>
        </main>
      </div>
    </div>
  );
}
