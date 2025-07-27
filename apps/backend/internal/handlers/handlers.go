package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"hookinator/internal/database"
	"hookinator/internal/utils"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
)

// contextKey is a custom type to avoid context key collisions.
type contextKey string

const userContextKey = contextKey("userID")

// Handler holds dependencies for the application.
type Handler struct {
	DB        *database.DB
	Client    *http.Client
	BaseURL   string
	JWTSecret string
}

// New creates a new Handler instance with dependencies.
func New(db *database.DB, baseURL, jwtSecret string) *Handler {
	return &Handler{
		DB: db,
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
		BaseURL:   baseURL,
		JWTSecret: jwtSecret,
	}
}

// --- JSON Response Helpers ---

func (h *Handler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshalling JSON: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}

func (h *Handler) respondWithError(w http.ResponseWriter, code int, message string) {
	h.respondWithJSON(w, code, map[string]string{"error": message})
}

// --- Middleware ---

func (h *Handler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			h.respondWithError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(h.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			h.respondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			h.respondWithError(w, http.StatusUnauthorized, "Invalid token claims")
			return
		}
		userID, ok := claims["sub"].(string)
		if !ok || userID == "" {
			h.respondWithError(w, http.StatusUnauthorized, "User ID not found in token")
			return
		}

		ctx := context.WithValue(r.Context(), userContextKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// --- Public Handlers ---

// HandleGoogleLogin would be here (as implemented before).

// HandleWebhook receives, logs, and forwards an incoming webhook.
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	// This handler remains public and unchanged.
	id := chi.URLParam(r, "id")

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Cannot read request body")
		return
	}
	defer r.Body.Close()

	webhookReq := database.WebhookRequest{
		Timestamp: time.Now(),
		Method:    r.Method,
		Headers:   r.Header,
		Body:      string(bodyBytes),
	}

	if err := h.DB.SaveRequest(r.Context(), id, webhookReq); err != nil {
		log.Printf("Failed to save webhook request: %v", err)
	}

	forwardURL, err := h.DB.GetForwardURL(r.Context(), id)
	if err != nil {
		log.Printf("Failed to get forward URL for %s: %v", id, err)
	} else if forwardURL != "" {
		go func() {
			req, err := http.NewRequestWithContext(context.Background(), r.Method, forwardURL, bytes.NewReader(bodyBytes))
			if err != nil {
				log.Printf("Failed to create forward request for %s: %v", id, err)
				return
			}
			req.Header = r.Header.Clone()

			resp, err := h.Client.Do(req)
			if err != nil {
				log.Printf("Failed to forward webhook for %s: %v", id, err)
				return
			}
			defer resp.Body.Close()
			log.Printf("Webhook for %s forwarded to %s, status: %d", id, forwardURL, resp.StatusCode)
		}()
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"status": "Webhook received"})
}

// --- Protected Handlers ---

type CreateRequest struct {
	Name       string `json:"name"`
	SourceType string `json:"source_type"`
}

func (h *Handler) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userContextKey).(string)

	var req CreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields
	if req.Name == "" || req.SourceType == "" {
		h.respondWithError(w, http.StatusBadRequest, "Name and source_type are required")
		return
	}

	id, err := utils.GenerateID(12)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to generate ID")
		return
	}

	// The forward URL is now an empty string by default
	if err := h.DB.CreateWebhook(r.Context(), id, userID, "", req.Name, req.SourceType); err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to create webhook")
		return
	}

	resp := map[string]string{
		"webhook_url": fmt.Sprintf("%s/webhook/%s", h.BaseURL, id),
		"inspect_url": fmt.Sprintf("%s/inspect/%s", h.BaseURL, id),
	}
	h.respondWithJSON(w, http.StatusCreated, resp)
}

func (h *Handler) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userContextKey).(string)

	webhooks, err := h.DB.GetWebhooksForUser(r.Context(), userID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve webhooks")
		return
	}

	h.respondWithJSON(w, http.StatusOK, webhooks)
}

func (h *Handler) GetWebhook(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userContextKey).(string)
	webhookID := chi.URLParam(r, "id")

	webhook, err := h.DB.GetWebhookByID(r.Context(), webhookID, userID)
	if err != nil {
		if err.Error() == "webhook not found" {
			h.respondWithError(w, http.StatusNotFound, "Webhook not found")
		} else {
			h.respondWithError(w, http.StatusInternalServerError, "Failed to retrieve webhook")
		}
		return
	}

	h.respondWithJSON(w, http.StatusOK, webhook)
}

func (h *Handler) DeleteWebhook(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userContextKey).(string)
	webhookID := chi.URLParam(r, "id")

	// Check if webhook exists and belongs to user
	exists, err := h.DB.CheckWebhookOwnership(r.Context(), webhookID, userID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to verify webhook ownership")
		return
	}
	if !exists {
		h.respondWithError(w, http.StatusNotFound, "Webhook not found")
		return
	}

	// Delete the webhook
	err = h.DB.DeleteWebhook(r.Context(), webhookID, userID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to delete webhook")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"message": "Webhook deleted successfully"})
}

func (h *Handler) UpdateWebhook(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userContextKey).(string)
	webhookID := chi.URLParam(r, "id")

	// Check if webhook exists and belongs to user
	exists, err := h.DB.CheckWebhookOwnership(r.Context(), webhookID, userID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to verify webhook ownership")
		return
	}
	if !exists {
		h.respondWithError(w, http.StatusNotFound, "Webhook not found")
		return
	}

	var req struct {
		ForwardURL string `json:"forward_url"`
		Name       string `json:"name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Update the webhook
	err = h.DB.UpdateWebhook(r.Context(), webhookID, userID, req.ForwardURL, req.Name)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to update webhook")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"message": "Webhook updated successfully"})
}

func (h *Handler) InspectWebhook(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(userContextKey).(string)
	webhookID := chi.URLParam(r, "id")

	// --- UNCOMMENT THIS BLOCK ---
	isOwner, err := h.DB.CheckWebhookOwnership(r.Context(), webhookID, userID)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to verify ownership")
		return
	}
	if !isOwner {
		h.respondWithError(w, http.StatusForbidden, "You do not have permission to view this webhook")
		return
	}
	// --- END OF BLOCK ---

	events, err := h.DB.GetRequests(r.Context(), webhookID, 100)
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to get webhook requests")
		return
	}

	h.respondWithJSON(w, http.StatusOK, events)
}


// HandleGoogleLogin handles Google OAuth login and returns a JWT token
func (h *Handler) HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token string `json:"token"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Token == "" {
		h.respondWithError(w, http.StatusBadRequest, "Token is required")
		return
	}

	// For this implementation, we'll create a simple JWT
	// In production, you'd want to verify the Google token first
	userID := fmt.Sprintf("google_%d", time.Now().Unix()) // Simple user ID generation
	email := fmt.Sprintf("user_%d@example.com", time.Now().Unix()) // Unique email for each user
	
	// Upsert user in database
	if err := h.DB.UpsertUser(r.Context(), userID, email); err != nil {
		log.Printf("Failed to upsert user: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Failed to save user")
		return
	}

	// Create JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"email": email,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.JWTSecret))
	if err != nil {
		h.respondWithError(w, http.StatusInternalServerError, "Failed to create token")
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{
		"jwt_token": tokenString,
		"user_id": userID,
	})
}