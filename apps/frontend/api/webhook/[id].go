package handler

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // Postgres driver
)

// WebhookRequest represents a single webhook request captured.
type WebhookRequest struct {
	Timestamp time.Time   `json:"timestamp"`
	Method    string      `json:"method"`
	Headers   http.Header `json:"headers"`
	Body      string      `json:"body"`
}

// DB holds the database connection pool.
type DB struct {
	*sql.DB
}

// Handler is the main function that Vercel will call for /api/webhook/{id} requests
func Handler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for Vercel
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract the webhook ID from the URL path
	// Vercel will route /api/webhook/{id} to this function
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

	// Handle the webhook request
	handleWebhookRequest(w, r, db, webhookID)
}

// initDatabase creates a new database connection for the serverless function
func initDatabase() (*DB, error) {
	connStr := fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s sslmode=require",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	db, err := sql.Open("pgx", connStr)
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

// handleWebhookRequest processes the incoming webhook request
func handleWebhookRequest(w http.ResponseWriter, r *http.Request, db *DB, webhookID string) {
	// Read the request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Cannot read request body")
		return
	}
	defer r.Body.Close()

	// Create webhook request object
	webhookReq := WebhookRequest{
		Timestamp: time.Now(),
		Method:    r.Method,
		Headers:   r.Header,
		Body:      string(bodyBytes),
	}

	// Save the request to database
	if err := saveRequest(db, r.Context(), webhookID, webhookReq); err != nil {
		log.Printf("Failed to save webhook request: %v", err)
		// Continue processing even if save fails
	}

	// Check for forwarding URL and forward the request if configured
	forwardURL, err := getForwardURL(db, r.Context(), webhookID)
	if err != nil {
		log.Printf("Failed to get forward URL for %s: %v", webhookID, err)
	} else if forwardURL != "" {
		// Forward the request asynchronously
		go forwardWebhook(r, forwardURL, bodyBytes, webhookID)
	}

	// Respond with success
	respondWithJSON(w, http.StatusOK, map[string]string{"status": "Webhook received"})
}

// saveRequest saves a webhook request to the database
func saveRequest(db *DB, ctx context.Context, webhookID string, req WebhookRequest) error {
	headersJSON, err := json.Marshal(req.Headers)
	if err != nil {
		return fmt.Errorf("failed to marshal headers to JSON: %w", err)
	}

	query := `
	INSERT INTO requests (webhook_id, method, headers, body, received_at)
	VALUES ($1, $2, $3, $4, $5)`

	_, err = db.ExecContext(ctx, query, webhookID, req.Method, headersJSON, req.Body, req.Timestamp)
	if err != nil {
		return fmt.Errorf("failed to save request for webhook %s: %w", webhookID, err)
	}
	return nil
}

// getForwardURL retrieves the forwarding URL for a given webhook ID
func getForwardURL(db *DB, ctx context.Context, webhookID string) (string, error) {
	var forwardURL sql.NullString
	query := `SELECT forward_url FROM webhooks WHERE id = $1`
	err := db.QueryRowContext(ctx, query, webhookID).Scan(&forwardURL)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", fmt.Errorf("failed to query forward URL: %w", err)
	}
	return forwardURL.String, nil
}

// forwardWebhook forwards the webhook request to the configured URL
func forwardWebhook(originalReq *http.Request, forwardURL string, bodyBytes []byte, webhookID string) {
	// Create a new HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Create the forward request
	req, err := http.NewRequestWithContext(context.Background(), originalReq.Method, forwardURL, bytes.NewReader(bodyBytes))
	if err != nil {
		log.Printf("Failed to create forward request for %s: %v", webhookID, err)
		return
	}

	// Copy headers from original request
	req.Header = originalReq.Header.Clone()

	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to forward webhook for %s: %v", webhookID, err)
		return
	}
	defer resp.Body.Close()

	log.Printf("Webhook for %s forwarded to %s, status: %d", webhookID, forwardURL, resp.StatusCode)
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