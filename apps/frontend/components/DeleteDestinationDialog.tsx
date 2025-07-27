"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateWebhook } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useState } from "react";

interface DeleteDestinationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  webhookId: string;
  webhookName: string;
  forwardUrl: string;
  onDestinationDeleted: () => void;
}

export default function DeleteDestinationDialog({
  isOpen,
  onClose,
  webhookId,
  webhookName,
  forwardUrl,
  onDestinationDeleted,
}: DeleteDestinationDialogProps) {
  const { data: session } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!session?.backendToken) {
      toast.error("Authentication required");
      return;
    }

    setIsDeleting(true);
    try {
      await updateWebhook(
        webhookId,
        { forward_url: "" },
        session.backendToken as string
      );
      toast.success("Destination deleted successfully");
      onDestinationDeleted();
      onClose();
    } catch (error) {
      toast.error("Failed to delete destination");
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-black text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Delete Destination
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Are you sure you want to delete the destination for{" "}
            <span className="font-mono text-white">{webhookName}</span>? This
            will stop forwarding webhook requests to{" "}
            <span className="font-mono text-white">{forwardUrl}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white border-0 disabled:bg-red-600/50 disabled:text-red-300"
          >
            {isDeleting ? "Deleting..." : "Delete Destination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
