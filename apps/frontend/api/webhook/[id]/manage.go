package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// DB holds the database connection pool.
type DB struct {
	*sql.DB
}

// Webhook represents a webhook in the database
type Webhook struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	SourceType string    `json:"source_type"`
	ForwardURL *string   `json:"forward_url,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UserID     string    `json:"user_id"`
}

// UpdateWebhookPayload represents the payload for updating a webhook
type UpdateWebhookPayload struct {
	Name       *string `json:"name,omitempty"`
	ForwardURL *string `json:"forward_url,omitempty"`
}

// Handler handles individual webhook operations
func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract the webhook ID from the URL path
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		respondWithError(w, http.StatusBadRequest, "Invalid webhook ID")
		return
	}
	webhookID := pathParts[3] // /api/webhook/{id} -> parts[3] is the ID

	// Initialize database connection
	db, err := initDatabase()
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Database connection failed")
		return
	}
	defer db.Close()

	// Extract user ID from JWT token
	userID, err := extractUserIDFromToken(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Route based on method
	switch r.Method {
	case "GET":
		handleGetWebhook(w, r, db, webhookID, userID)
	case "PUT":
		handleUpdateWebhook(w, r, db, webhookID, userID)
	case "DELETE":
		handleDeleteWebhook(w, r, db, webhookID, userID)
	default:
		respondWithError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

// initDatabase creates a new database connection for the serverless function
func initDatabase() (*DB, error) {
	// Try to use DATABASE_URL first (Vercel Neon connection string)
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Set connection pool settings for serverless
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(30 * time.Second)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{db}, nil
}

// extractUserIDFromToken extracts user ID from JWT token
func extractUserIDFromToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("no authorization header")
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		return "", fmt.Errorf("invalid authorization header format")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return "", fmt.Errorf("JWT_SECRET not configured")
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return "", fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if userID, ok := claims["sub"].(string); ok {
			return userID, nil
		}
	}

	return "", fmt.Errorf("invalid token")
}

// handleGetWebhook handles GET /webhook/{id}
func handleGetWebhook(w http.ResponseWriter, r *http.Request, db *DB, webhookID, userID string) {
	query := `
		SELECT id, name, source_type, forward_url, created_at, user_id
		FROM webhooks 
		WHERE id = $1 AND user_id = $2
	`
	
	var webhook Webhook
	var forwardURL sql.NullString
	err := db.QueryRowContext(r.Context(), query, webhookID, userID).
		Scan(&webhook.ID, &webhook.Name, &webhook.SourceType, &forwardURL, &webhook.CreatedAt, &webhook.UserID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Webhook not found")
			return
		}
		log.Printf("Failed to query webhook: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch webhook")
		return
	}

	if forwardURL.Valid {
		webhook.ForwardURL = &forwardURL.String
	}

	respondWithJSON(w, http.StatusOK, webhook)
}

// handleUpdateWebhook handles PUT /webhook/{id}
func handleUpdateWebhook(w http.ResponseWriter, r *http.Request, db *DB, webhookID, userID string) {
	var payload UpdateWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Build dynamic update query
	var updates []string
	var args []interface{}
	argIndex := 1

	if payload.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *payload.Name)
		argIndex++
	}

	if payload.ForwardURL != nil {
		updates = append(updates, fmt.Sprintf("forward_url = $%d", argIndex))
		args = append(args, *payload.ForwardURL)
		argIndex++
	}

	if len(updates) == 0 {
		respondWithError(w, http.StatusBadRequest, "No fields to update")
		return
	}

	// Add webhookID and userID to args
	args = append(args, webhookID, userID)

	query := fmt.Sprintf(`
		UPDATE webhooks 
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, name, source_type, forward_url, created_at, user_id
	`, strings.Join(updates, ", "), argIndex, argIndex+1)

	var webhook Webhook
	var forwardURL sql.NullString
	err := db.QueryRowContext(r.Context(), query, args...).
		Scan(&webhook.ID, &webhook.Name, &webhook.SourceType, &forwardURL, &webhook.CreatedAt, &webhook.UserID)
	
	if err != nil {
		if err == sql.ErrNoRows {
			respondWithError(w, http.StatusNotFound, "Webhook not found")
			return
		}
		log.Printf("Failed to update webhook: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to update webhook")
		return
	}

	if forwardURL.Valid {
		webhook.ForwardURL = &forwardURL.String
	}

	respondWithJSON(w, http.StatusOK, webhook)
}

// handleDeleteWebhook handles DELETE /webhook/{id}
func handleDeleteWebhook(w http.ResponseWriter, r *http.Request, db *DB, webhookID, userID string) {
	query := `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`
	
	result, err := db.ExecContext(r.Context(), query, webhookID, userID)
	if err != nil {
		log.Printf("Failed to delete webhook: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to delete webhook")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Failed to get rows affected: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to delete webhook")
		return
	}

	if rowsAffected == 0 {
		respondWithError(w, http.StatusNotFound, "Webhook not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// respondWithJSON sends a JSON response
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
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

// respondWithError sends an error response
func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
} 