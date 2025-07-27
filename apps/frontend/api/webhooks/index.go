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

// CreateWebhookPayload represents the payload for creating a webhook
type CreateWebhookPayload struct {
	Name       string `json:"name"`
	SourceType string `json:"source_type"`
}

// Handler handles webhook management operations
func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

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

	// Route based on method and path
	switch r.Method {
	case "GET":
		handleGetWebhooks(w, r, db, userID)
	case "POST":
		handleCreateWebhook(w, r, db, userID)
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

// handleGetWebhooks handles GET /webhooks
func handleGetWebhooks(w http.ResponseWriter, r *http.Request, db *DB, userID string) {
	query := `
		SELECT id, name, source_type, forward_url, created_at, user_id
		FROM webhooks 
		WHERE user_id = $1 
		ORDER BY created_at DESC
	`
	
	rows, err := db.QueryContext(r.Context(), query, userID)
	if err != nil {
		log.Printf("Failed to query webhooks: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch webhooks")
		return
	}
	defer rows.Close()

	var webhooks []Webhook
	for rows.Next() {
		var webhook Webhook
		var forwardURL sql.NullString
		err := rows.Scan(&webhook.ID, &webhook.Name, &webhook.SourceType, &forwardURL, &webhook.CreatedAt, &webhook.UserID)
		if err != nil {
			log.Printf("Failed to scan webhook: %v", err)
			continue
		}
		if forwardURL.Valid {
			webhook.ForwardURL = &forwardURL.String
		}
		webhooks = append(webhooks, webhook)
	}

	respondWithJSON(w, http.StatusOK, webhooks)
}

// handleCreateWebhook handles POST /webhooks
func handleCreateWebhook(w http.ResponseWriter, r *http.Request, db *DB, userID string) {
	var payload CreateWebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if payload.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Name is required")
		return
	}

	// Generate a unique webhook ID
	webhookID := fmt.Sprintf("wh_%d", time.Now().UnixNano())

	query := `
		INSERT INTO webhooks (id, name, source_type, user_id, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, source_type, created_at, user_id
	`

	var webhook Webhook
	err := db.QueryRowContext(r.Context(), query, webhookID, payload.Name, payload.SourceType, userID, time.Now()).
		Scan(&webhook.ID, &webhook.Name, &webhook.SourceType, &webhook.CreatedAt, &webhook.UserID)
	
	if err != nil {
		log.Printf("Failed to create webhook: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create webhook")
		return
	}

	respondWithJSON(w, http.StatusCreated, webhook)
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