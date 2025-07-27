"use client";

import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Globe,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { updateWebhook } from "@/lib/api";
import { useSession } from "next-auth/react";

interface DestinationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  webhookId: string;
  webhookName: string;
  currentForwardUrl?: string;
  onDestinationUpdated: () => void;
}

export default function DestinationDialog({
  isOpen,
  onClose,
  webhookId,
  webhookName,
  currentForwardUrl,
  onDestinationUpdated,
}: DestinationDialogProps) {
  const { data: session } = useSession();
  const [forwardUrl, setForwardUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForwardUrl(currentForwardUrl || "");
    }
  }, [isOpen, currentForwardUrl]);

  useEffect(() => {
    // Basic URL validation
    try {
      if (forwardUrl.trim() === "") {
        setIsValidUrl(false);
        return;
      }
      new URL(forwardUrl);
      setIsValidUrl(true);
    } catch {
      setIsValidUrl(false);
    }
  }, [forwardUrl]);

  const handleSave = async () => {
    if (!session?.backendToken) {
      toast.error("Authentication required");
      return;
    }

    if (!isValidUrl) {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsLoading(true);
    try {
      await updateWebhook(
        webhookId,
        { forward_url: forwardUrl },
        session.backendToken as string
      );
      toast.success("Destination updated successfully");
      onDestinationUpdated();
      handleClose();
    } catch (error) {
      toast.error("Failed to update destination");
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!session?.backendToken) {
      toast.error("Authentication required");
      return;
    }

    setIsLoading(true);
    try {
      await updateWebhook(
        webhookId,
        { forward_url: "" },
        session.backendToken as string
      );
      toast.success("Destination removed successfully");
      onDestinationUpdated();
      handleClose();
    } catch (error) {
      toast.error("Failed to remove destination");
      console.error("Remove error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setForwardUrl("");
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-black text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Manage Destination
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Configure where incoming webhook requests should be forwarded for{" "}
            <span className="font-mono text-white">{webhookName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Current Destination Status */}
          {currentForwardUrl && (
            <Card className="border-green-500/20 bg-green-950/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Active Destination
                  </CardTitle>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ExternalLink className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-mono text-green-200 break-all">
                      {currentForwardUrl}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={isLoading}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add/Update Destination */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="forwardUrl"
                className="text-sm font-medium text-gray-300"
              >
                {currentForwardUrl
                  ? "Update Destination URL"
                  : "Add Destination URL"}
              </Label>
              <div className="relative">
                <Input
                  id="forwardUrl"
                  type="url"
                  value={forwardUrl}
                  onChange={(e) => setForwardUrl(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 pr-10"
                  placeholder="https://your-api.com/webhook"
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {forwardUrl &&
                    (isValidUrl ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Enter a valid HTTPS URL where webhook requests should be
                forwarded
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValidUrl || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white border-0 disabled:bg-blue-600/50 disabled:text-blue-300"
          >
            {isLoading ? "Saving..." : "Save Destination"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
