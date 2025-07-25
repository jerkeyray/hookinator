export interface CreateWebhookPayload {
  forwardUrl: string;
  userId: string;
}

export interface WebhookResponse {
  webhook_url: string;
  inspect_url: string;
}