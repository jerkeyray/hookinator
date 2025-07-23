import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, ArrowRight } from "lucide-react";

export type Webhook = {
  id: string;
  url: string;
  createdAt: string;
  requests: number;
};

export default function WebhookList({ webhooks }: { webhooks: Webhook[] }) {
  return (
    <Card className="border-gray-800 bg-black shadow-lg shadow-white/5">
      <CardHeader>
        <CardTitle>Your Endpoints</CardTitle>
        <CardDescription>
          Manage your webhook endpoints and inspect their requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-black">
              <TableHead>Endpoint URL</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="hidden md:table-cell text-center">
                Requests
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((hook: Webhook) => (
              <TableRow
                key={hook.id}
                className="border-gray-800 hover:bg-gray-900/50"
              >
                <TableCell>
                  <div className="font-mono text-xs bg-gray-900 p-2 rounded-md flex items-center justify-between">
                    <span>{hook.url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Copy endpoint URL"
                    >
                      <Copy className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {hook.createdAt}
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                  {hook.requests}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:bg-gray-800"
                  >
                    Inspect
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
