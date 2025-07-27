"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import Sidebar from "../dashboard/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, User } from "lucide-react";
import DeleteAllWebhooksDialog from "@/components/DeleteAllWebhooksDialog";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);

  const userImage = session?.user?.image || "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36";

  const userName = session?.user?.name || "User";

  // Route Protection
  if (status === "unauthenticated") {
    redirect("/sign-in");
  }

  // Loading State
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p>Loading...</p>
      </div>
    );
  }

  const handleWebhooksDeleted = () => {
    // This will be called after webhooks are deleted
    // You can add any additional logic here if needed
  };

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden">
      <Sidebar userImage={userImage} userName={userName} />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-1 flex-col items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-10 overflow-auto">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center">
              <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl xl:text-4xl text-white mb-2">
                Settings
              </h1>
              <p className="text-gray-400 text-sm lg:text-base">
                Manage your account and webhook endpoints
              </p>
            </div>

            <div className="space-y-6">
              {/* User Profile */}
              <Card className="border-gray-700 bg-gray-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="h-5 w-5" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    {userImage ? (
                      <img
                        src={userImage}
                        alt={userName}
                        className="w-16 h-16 rounded-full border-2 border-gray-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-gray-700 bg-gray-800 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-400">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {userName}
                      </h3>
                      <p className="text-gray-400">{session?.user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-red-700 bg-red-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">
                        Delete All Webhook Endpoints
                      </p>
                      <p className="text-gray-400 text-sm">
                        Permanently delete all your webhook endpoints and their
                        associated data. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      onClick={() => setDeleteAllDialog(true)}
                      className="bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Endpoints
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Delete All Webhooks Dialog */}
      <DeleteAllWebhooksDialog
        isOpen={deleteAllDialog}
        onClose={() => setDeleteAllDialog(false)}
        onWebhooksDeleted={handleWebhooksDeleted}
      />
    </div>
  );
}
