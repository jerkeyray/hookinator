package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"hookinator/internal/database"
	"hookinator/internal/middleware"
	"hookinator/internal/utils"

	"github.com/go-chi/chi/v5"
)

// Handler holds the database connection and provides HTTP handlers
type Handler struct {
	DB *database.DB
}

// New creates a new Handler instance with the provided database connection
func New(db *database.DB) *Handler {
	return &Handler{
		DB: db,
	}
}

type CreateWebhookRequest struct {
	ForwardURL string `json:"forward_url"`
}

// CreateUserWebhook creates a new webhook for the authenticated user
func (h *Handler) CreateUserWebhook(w http.ResponseWriter, r *http.Request) {
	// Get userID from context (set by AuthMiddleware)
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	var req CreateWebhookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Generate a unique webhook ID
	webhookID, err := utils.GenerateID(12)
	if err != nil {
		http.Error(w, "Failed to generate webhook ID", http.StatusInternalServerError)
		return
	}

	// Create the webhook in the database
	if err := h.DB.CreateUserWebhook(webhookID, userID, req.ForwardURL); err != nil {
		http.Error(w, "Failed to create webhook", http.StatusInternalServerError)
		return
	}

	// Return the webhook information
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	resp := map[string]string{
		"id":          webhookID,
		"webhook_url": fmt.Sprintf("%s/webhook/%s", baseURL, webhookID),
		"forward_url": req.ForwardURL,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetUserWebhooks retrieves all webhooks for the authenticated user
func (h *Handler) GetUserWebhooks(w http.ResponseWriter, r *http.Request) {
	// Get userID from context (set by AuthMiddleware)
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get webhooks from database
	webhooks, err := h.DB.GetUserWebhooks(userID)
	if err != nil {
		http.Error(w, "Failed to get webhooks", http.StatusInternalServerError)
		return
	}

	// Add webhook_url to each webhook for frontend convenience
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}
	for _, webhook := range webhooks {
		if id, ok := webhook["id"].(string); ok {
			webhook["webhook_url"] = fmt.Sprintf("%s/webhook/%s", baseURL, id)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(webhooks)
}

// GetWebhookRequests retrieves requests for a specific webhook owned by the authenticated user
func (h *Handler) GetWebhookRequests(w http.ResponseWriter, r *http.Request) {
	// Get userID from context (set by AuthMiddleware)
	userID, ok := r.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		http.Error(w, "User ID not found in context", http.StatusUnauthorized)
		return
	}

	// Get webhook ID from URL parameter
	webhookID := chi.URLParam(r, "id")
	if webhookID == "" {
		http.Error(w, "Webhook ID is required", http.StatusBadRequest)
		return
	}

	// Get webhook requests from database (with ownership check)
	requests, err := h.DB.GetWebhookRequests(webhookID, userID, 50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}
