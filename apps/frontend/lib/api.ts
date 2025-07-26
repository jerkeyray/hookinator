import type {
  CreateWebhookPayload,
  WebhookResponse,
  ApiWebhook,
  WebhookRequest,
} from "./types";

// Use an environment variable for the API URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function createWebhook(
  payload: CreateWebhookPayload,
  authToken: string
): Promise<WebhookResponse> {
  const response = await fetch(`${API_BASE_URL}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create webhook");
  }

  const result = await response.json();
  return result;
}

export async function getWebhooks(authToken: string): Promise<ApiWebhook[]> {
  const response = await fetch(`${API_BASE_URL}/webhooks`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch webhooks");
  }

  const data = await response.json();
  // The backend might return null if there are no webhooks
  return data || [];
}

export async function getWebhook(
  webhookId: string,
  authToken: string
): Promise<ApiWebhook> {
  const response = await fetch(`${API_BASE_URL}/webhook/${webhookId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch webhook");
  }

  const result = await response.json();
  return result;
}

export async function getWebhookRequests(
  webhookId: string,
  authToken: string
): Promise<WebhookRequest[]> {
  const response = await fetch(`${API_BASE_URL}/inspect/${webhookId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch webhook requests");
  }

  const data = await response.json();
  return data || [];
}

export async function updateWebhook(
  webhookId: string,
  updates: { name?: string; forward_url?: string },
  authToken: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/webhooks/${webhookId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update webhook");
  }
}

export async function deleteWebhook(
  webhookId: string,
  authToken: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/webhooks/${webhookId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to delete webhook");
  }
}
