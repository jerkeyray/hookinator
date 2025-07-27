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
import { AlertTriangle } from "lucide-react";

interface DeleteWebhookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  webhookName: string;
}

export default function DeleteWebhookDialog({
  isOpen,
  onClose,
  onConfirm,
  webhookName,
}: DeleteWebhookDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (confirmationText !== webhookName) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      handleClose();
    } catch {
      // Error handling is done in the parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    setIsDeleting(false);
    onClose();
  };

  const isConfirmDisabled = confirmationText !== webhookName || isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-black text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Delete Endpoint
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            This action cannot be undone. This will permanently delete the{" "}
            <span className="font-mono text-white">{webhookName}</span> endpoint
            and remove all of its data from our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label
              htmlFor="confirmation"
              className="text-sm font-medium text-gray-300"
            >
              Please type{" "}
              <span className="font-mono text-white">{webhookName}</span> to
              confirm.
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
              placeholder="Enter endpoint name to confirm"
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
            {isDeleting ? "Deleting..." : "Delete Endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
