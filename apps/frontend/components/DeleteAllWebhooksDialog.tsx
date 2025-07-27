"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getWebhooks, deleteWebhook } from "@/lib/api";
import { useSession } from "next-auth/react";

interface DeleteAllWebhooksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onWebhooksDeleted: () => void;
}

export default function DeleteAllWebhooksDialog({
  isOpen,
  onClose,
  onWebhooksDeleted,
}: DeleteAllWebhooksDialogProps) {
  const { data: session } = useSession();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const userName = session?.user?.name || "User";

  const handleConfirm = async () => {
    if (confirmationText !== userName) return;

    if (!session?.backendToken) {
      toast.error("Authentication required");
      return;
    }

    setIsDeleting(true);
    try {
      // Get all webhooks first
      const webhooks = await getWebhooks(session.backendToken as string);

      // Delete each webhook
      const deletePromises = webhooks.map((webhook) =>
        deleteWebhook(webhook.id, session.backendToken as string)
      );

      await Promise.all(deletePromises);

      toast.success(
        `Successfully deleted ${webhooks.length} webhook endpoints`
      );
      onWebhooksDeleted();
      handleClose();
    } catch (error) {
      toast.error("Failed to delete all webhooks");
      console.error("Delete all webhooks error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    setIsDeleting(false);
    onClose();
  };

  const isConfirmDisabled = confirmationText !== userName || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-black text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Delete All Webhooks
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            This action cannot be undone. This will permanently delete ALL your
            webhook endpoints and remove all of their data from our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="confirmation"
              className="text-sm font-medium text-gray-300"
            >
              Please type{" "}
              <span className="font-mono text-white">{userName}</span> to
              confirm.
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
              placeholder="Enter username to confirm"
              disabled={isDeleting}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="bg-red-600 hover:bg-red-700 text-white border-0 disabled:bg-red-600/50 disabled:text-red-300"
          >
            {isDeleting ? "Deleting..." : "Delete All Webhooks"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
