"use client";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import WebhookList, { Webhook } from "@/components/WebhookList";
import EmptyState from "@/components/EmptyState";
import { useSession } from "next-auth/react";

// Minimal mock data for demonstration
const userWebhooks: Webhook[] = [];

export default function DashboardPage() {
  const { data: session } = useSession();
  const userImage =
    session?.user?.image ||
    "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36";
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] bg-black text-white">
      <Sidebar />
      <div className="flex flex-col">
        <DashboardHeader userImage={userImage} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">My Webhooks</h1>
            {/* The Create Webhook button is in the header for minimalism */}
          </div>
          {userWebhooks.length > 0 ? (
            <WebhookList webhooks={userWebhooks} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
