export interface CreateWebhookPayload {
  name: string;
  source_type: string;
}

export interface WebhookResponse {
  webhook_url: string;
  inspect_url: string;
}

export interface ApiWebhook {
  id: string;
  user_id: string;
  forward_url: string;
  created_at: string;
}

export interface WebhookRequest {
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}
