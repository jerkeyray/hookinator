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

// WebhookRequest represents a webhook request in the database
type WebhookRequest struct {
	ID         int       `json:"id"`
	WebhookID  string    `json:"webhook_id"`
	Method     string    `json:"method"`
	Headers    string    `json:"headers"`
	Body       string    `json:"body"`
	ReceivedAt time.Time `json:"received_at"`
}

// Handler handles webhook inspection operations
func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
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
	webhookID := pathParts[3] // /api/inspect/{id} -> parts[3] is the ID

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

	// Verify webhook ownership
	if err := verifyWebhookOwnership(db, r.Context(), webhookID, userID); err != nil {
		respondWithError(w, http.StatusForbidden, "Access denied")
		return
	}

	// Route based on method
	switch r.Method {
	case "GET":
		handleGetRequests(w, r, db, webhookID)
	case "DELETE":
		handleClearRequests(w, r, db, webhookID)
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

// verifyWebhookOwnership verifies that the webhook belongs to the user
func verifyWebhookOwnership(db *DB, ctx context.Context, webhookID, userID string) error {
	query := `SELECT id FROM webhooks WHERE id = $1 AND user_id = $2`
	var id string
	err := db.QueryRowContext(ctx, query, webhookID, userID).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("webhook not found or access denied")
		}
		return fmt.Errorf("failed to verify webhook ownership: %w", err)
	}
	return nil
}

// handleGetRequests handles GET /inspect/{id}
func handleGetRequests(w http.ResponseWriter, r *http.Request, db *DB, webhookID string) {
	query := `
		SELECT id, webhook_id, method, headers, body, received_at
		FROM requests 
		WHERE webhook_id = $1 
		ORDER BY received_at DESC
	`
	
	rows, err := db.QueryContext(r.Context(), query, webhookID)
	if err != nil {
		log.Printf("Failed to query requests: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch requests")
		return
	}
	defer rows.Close()

	var requests []WebhookRequest
	for rows.Next() {
		var req WebhookRequest
		err := rows.Scan(&req.ID, &req.WebhookID, &req.Method, &req.Headers, &req.Body, &req.ReceivedAt)
		if err != nil {
			log.Printf("Failed to scan request: %v", err)
			continue
		}
		requests = append(requests, req)
	}

	respondWithJSON(w, http.StatusOK, requests)
}

// handleClearRequests handles DELETE /inspect/{id}
func handleClearRequests(w http.ResponseWriter, r *http.Request, db *DB, webhookID string) {
	query := `DELETE FROM requests WHERE webhook_id = $1`
	
	result, err := db.ExecContext(r.Context(), query, webhookID)
	if err != nil {
		log.Printf("Failed to clear requests: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to clear requests")
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Failed to get rows affected: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to clear requests")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": fmt.Sprintf("Cleared %d requests", rowsAffected),
		"cleared": rowsAffected,
	})
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