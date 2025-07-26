"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWebhook } from "@/lib/api";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

export function CreateWebhookDialog({
  onWebhookCreated,
}: {
  onWebhookCreated: () => void;
}) {
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Try to get backend token from session or test token
    let backendToken = session?.backendToken;
    if (!backendToken) {
      const testToken = sessionStorage.getItem("testBackendToken");
      if (testToken) {
        backendToken = testToken;
      }
    }

    if (!backendToken) {
      toast.error(
        "Authentication error. Please sign in again or get a test token."
      );
      return;
    }

    try {
      await createWebhook({ name, source_type: "Generic" }, backendToken);
      toast.success("Webhook created successfully!");
      onWebhookCreated(); // Callback to refresh the list
      setIsOpen(false); // Close the dialog
      setName(""); // Reset input
    } catch (error) {
      toast.error("Failed to create webhook. Please try again.");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          data-testid="create-webhook-button"
          onClick={() => {}}
          className="bg-white text-black hover:bg-gray-100 border-0"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          add new source
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-black text-white border-gray-800 z-[9999]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Create a new Webhook
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Set up a new webhook endpoint to receive incoming requests
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-300"
              >
                Webhook Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
                placeholder="My Awesome Webhook"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              className="bg-white text-black hover:bg-gray-100 border-0"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
