import type { CreateWebhookPayload, WebhookResponse } from './types';

// Use an environment variable for the API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function createWebhook(
  payload: CreateWebhookPayload,
  authToken: string
): Promise<WebhookResponse> {

  const response = await fetch(`${API_BASE_URL}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create webhook');
  }

  return response.json();
}