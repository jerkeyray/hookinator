"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useState } from "react";
import Sidebar from "../dashboard/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Shield, User, Key, Trash2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const userImage =
    session?.user?.image ||
    "https://ui-avatars.com/api/?name=U&background=1a1a1a&color=fff&size=36";

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

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("API key regenerated successfully!");
    } catch (error) {
      console.error("API key regeneration error:", error);
      toast.error("Failed to regenerate API key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success("Account deletion initiated");
      } catch (error) {
        console.error("Account deletion error:", error);
        toast.error("Failed to delete account");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden">
      <Sidebar userImage={userImage} userName={userName} />
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 xl:p-10 overflow-auto">
          <div className="flex flex-col gap-2 flex-shrink-0">
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl xl:text-4xl text-white">
              Settings
            </h1>
            <p className="text-gray-400 text-sm lg:text-base">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl">
            {/* Profile Settings */}
            <Card className="border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-gray-300">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-black border-gray-700 text-white"
                    placeholder="Enter your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-black border-gray-700 text-white"
                    placeholder="Enter your email"
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      Email Notifications
                    </p>
                    <p className="text-gray-400 text-sm">
                      Receive notifications about webhook activity
                    </p>
                  </div>
                  <Button
                    variant={notificationsEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setNotificationsEnabled(!notificationsEnabled)
                    }
                    className={
                      notificationsEnabled
                        ? "bg-green-600 hover:bg-green-700"
                        : "border-gray-700 text-gray-300"
                    }
                  >
                    {notificationsEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Webhook Alerts</p>
                    <p className="text-gray-400 text-sm">
                      Get alerts when webhooks fail or encounter errors
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-gray-700 text-gray-300"
                  >
                    Coming Soon
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* API Settings */}
            <Card className="border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Key className="h-5 w-5" />
                  API Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value="hook_••••••••••••••••••••••••••••••••"
                      readOnly
                      className="bg-black border-gray-700 text-white font-mono text-sm"
                    />
                    <Button
                      onClick={handleRegenerateApiKey}
                      disabled={isLoading}
                      variant="outline"
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Use this key to authenticate API requests
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-gray-700 bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-white font-medium">Account Status</p>
                  <Badge
                    variant="secondary"
                    className="bg-green-900 text-green-300"
                  >
                    Active
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-white font-medium">
                    Two-Factor Authentication
                  </p>
                  <Badge
                    variant="secondary"
                    className="bg-gray-700 text-gray-300"
                  >
                    Coming Soon
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-700 bg-red-900/20 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Delete Account</p>
                    <p className="text-gray-400 text-sm">
                      Permanently delete your account and all associated data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={isLoading}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
