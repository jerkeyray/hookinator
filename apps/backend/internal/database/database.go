package database

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

	_ "github.com/jackc/pgx/v5/stdlib" // Postgres driver
)

// DB holds the database connection pool.
type DB struct {
	*sql.DB
}

// WebhookRequest represents a single webhook request captured.
type WebhookRequest struct {
	Timestamp time.Time   `json:"timestamp"`
	Method    string      `json:"method"`
	Headers   http.Header `json:"headers"`
	Body      string      `json:"body"`
}

// New connects to the database and returns a DB instance.
func New() (*DB, error) {
	// Try to use DATABASE_URL first, then fall back to individual variables
	databaseURL := os.Getenv("DATABASE_URL")
	var connStr string
	
	if databaseURL != "" {
		connStr = databaseURL
		log.Println("Using DATABASE_URL for connection")
	} else {
		// Determine SSL mode based on environment
		sslMode := "require" // Default for production
		if os.Getenv("ENVIRONMENT") == "development" || os.Getenv("DB_HOST") == "localhost" {
			sslMode = "disable"
		}
		
		// Fall back to individual environment variables
		connStr = fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s sslmode=%s",
			getEnvOrDefault("DB_USER", "postgres"),
			getEnvOrDefault("DB_PASSWORD", "postgres"),
			getEnvOrDefault("DB_HOST", "localhost"),
			getEnvOrDefault("DB_PORT", "5432"),
			getEnvOrDefault("DB_NAME", "hookinator"),
			sslMode,
		)
		log.Printf("Using individual environment variables for connection with sslmode=%s", sslMode)
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for i := 0; i < 5; i++ {
		err = db.PingContext(ctx)
		if err == nil {
			log.Println("Successfully connected to the database.")
			return &DB{db}, nil
		}
		log.Printf("Failed to ping database (attempt %d/5), retrying in 2 seconds... Error: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to database after several attempts: %w", err)
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Migrate creates the necessary database tables if they don't exist.
func (db *DB) Migrate(ctx context.Context) error {
	userTable := `
	CREATE TABLE IF NOT EXISTS users (
		id VARCHAR(255) PRIMARY KEY,
		email VARCHAR(255) UNIQUE,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	webhookTable := `
	CREATE TABLE IF NOT EXISTS webhooks (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		forward_url TEXT,
		name VARCHAR(255),
		source_type VARCHAR(50),
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	requestsTable := `
	CREATE TABLE IF NOT EXISTS requests (
		request_id SERIAL PRIMARY KEY,
		webhook_id VARCHAR(255) REFERENCES webhooks(id) ON DELETE CASCADE,
		method VARCHAR(10),
		headers JSONB,
		body TEXT,
		received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.ExecContext(ctx, userTable); err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}
	if _, err := db.ExecContext(ctx, webhookTable); err != nil {
		return fmt.Errorf("failed to create webhooks table: %w", err)
	}
	if _, err := db.ExecContext(ctx, requestsTable); err != nil {
		return fmt.Errorf("failed to create requests table: %w", err)
	}

	// Add missing columns to existing tables if they don't exist
	addMissingColumns := []string{
		`ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) NOT NULL DEFAULT 'default_user'`,
		`ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS name VARCHAR(255)`,
		`ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS source_type VARCHAR(50)`,
	}

	for _, query := range addMissingColumns {
		if _, err := db.ExecContext(ctx, query); err != nil {
			log.Printf("Warning: failed to add column: %v", err)
		}
	}

	log.Println("Database migration completed successfully.")
	return nil
}

// SaveRequest saves a webhook request to the database.
func (db *DB) SaveRequest(ctx context.Context, webhookID string, req WebhookRequest) error {
	// FIX: Marshal headers into a JSON string for the JSONB column.
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

// UpsertUser creates a new user or updates their email if they already exist.
func (db *DB) UpsertUser(ctx context.Context, id, email string) error {
	// First, try to insert with the new ID
	query := `
	INSERT INTO users (id, email) VALUES ($1, $2)
	ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
	`
	_, err := db.ExecContext(ctx, query, id, email)
	if err != nil {
		// If there's a conflict on email, try to update the existing user
		if strings.Contains(err.Error(), "users_email_key") {
			updateQuery := `
			UPDATE users SET id = $1 WHERE email = $2;
			`
			_, updateErr := db.ExecContext(ctx, updateQuery, id, email)
			if updateErr != nil {
				return fmt.Errorf("failed to upsert user: %w", updateErr)
			}
			return nil
		}
		return fmt.Errorf("failed to upsert user: %w", err)
	}
	return nil
}

// CreateWebhook creates or updates a webhook entry for a specific user.
func (db *DB) CreateWebhook(ctx context.Context, id, userID, forwardURL, name, sourceType string) error {
	query := `
	INSERT INTO webhooks (id, user_id, forward_url, name, source_type) 
	VALUES ($1, $2, $3, $4, $5) 
	ON CONFLICT (id) DO UPDATE SET 
		forward_url = EXCLUDED.forward_url,
		name = EXCLUDED.name,
		source_type = EXCLUDED.source_type;
	`
	_, err := db.ExecContext(ctx, query, id, userID, forwardURL, name, sourceType)
	return err
}

// GetForwardURL retrieves the forwarding URL for a given webhook ID.
func (db *DB) GetForwardURL(ctx context.Context, webhookID string) (string, error) {
	var forwardURL sql.NullString
	query := `SELECT forward_url FROM webhooks WHERE id = $1`
	err := db.QueryRowContext(ctx, query, webhookID).Scan(&forwardURL)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", err
		}
		return "", fmt.Errorf("failed to query forward URL: %w", err)
	}
	return forwardURL.String, nil
}

// GetWebhooksForUser retrieves all webhooks for a given user.
func (db *DB) GetWebhooksForUser(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	query := `
	SELECT id, user_id, forward_url, name, source_type, created_at
	FROM webhooks
	WHERE user_id = $1
	ORDER BY created_at DESC;
	`
	rows, err := db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query webhooks for user %s: %w", userID, err)
	}
	defer rows.Close()

	var webhooks []map[string]interface{}
	for rows.Next() {
		var id, dbUserID, forwardURL, name, sourceType string
		var createdAt time.Time
		if err := rows.Scan(&id, &dbUserID, &forwardURL, &name, &sourceType, &createdAt); err != nil {
			return nil, fmt.Errorf("failed to scan webhook row: %w", err)
		}
		webhooks = append(webhooks, map[string]interface{}{
			"id":           id,
			"user_id":      dbUserID,
			"forward_url":  forwardURL,
			"name":         name,
			"source_type":  sourceType,
			"created_at":   createdAt.Format(time.RFC3339),
		})
	}
	
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration: %w", err)
	}
	
	return webhooks, nil
}

// GetRequests retrieves webhook requests from the database for a given webhook ID.
func (db *DB) GetRequests(ctx context.Context, webhookID string, limit int) ([]WebhookRequest, error) {
	query := `
	SELECT r.method, r.headers, r.body, r.received_at
	FROM requests r
	JOIN webhooks w ON r.webhook_id = w.id
	WHERE r.webhook_id = $1
	ORDER BY r.received_at DESC
	LIMIT $2`

	rows, err := db.QueryContext(ctx, query, webhookID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query requests: %w", err)
	}
	defer rows.Close()

	var requests []WebhookRequest
	for rows.Next() {
		var req WebhookRequest
		var headersJSON []byte // Scan the JSONB data into a byte slice

		err := rows.Scan(&req.Method, &headersJSON, &req.Body, &req.Timestamp)
		if err != nil {
			return nil, fmt.Errorf("failed to scan request row: %w", err)
		}

		// FIX: Unmarshal the JSON byte slice into the headers map.
		if err := json.Unmarshal(headersJSON, &req.Headers); err != nil {
			log.Printf("Warning: failed to unmarshal headers for a request: %v", err)
			req.Headers = nil
		}

		requests = append(requests, req)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration: %w", err)
	}

	return requests, nil
}

// GetWebhookByID retrieves a single webhook by ID for a specific user.
func (db *DB) GetWebhookByID(ctx context.Context, webhookID, userID string) (map[string]interface{}, error) {
	query := `
	SELECT id, user_id, forward_url, name, source_type, created_at
	FROM webhooks
	WHERE id = $1 AND user_id = $2;
	`
	var id, dbUserID, forwardURL, name, sourceType string
	var createdAt time.Time
	err := db.QueryRowContext(ctx, query, webhookID, userID).Scan(&id, &dbUserID, &forwardURL, &name, &sourceType, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("webhook not found")
		}
		return nil, fmt.Errorf("failed to query webhook: %w", err)
	}
	
	return map[string]interface{}{
		"id":           id,
		"user_id":      dbUserID,
		"forward_url":  forwardURL,
		"name":         name,
		"source_type":  sourceType,
		"created_at":   createdAt.Format(time.RFC3339),
	}, nil
}

// CheckWebhookOwnership verifies that a webhook belongs to a specific user.
func (db *DB) CheckWebhookOwnership(ctx context.Context, webhookID, userID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM webhooks WHERE id = $1 AND user_id = $2)`
	err := db.QueryRowContext(ctx, query, webhookID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check webhook ownership: %w", err)
	}
	return exists, nil
}

// DeleteWebhook deletes a webhook by ID for a specific user.
func (db *DB) DeleteWebhook(ctx context.Context, webhookID, userID string) error {
	query := `DELETE FROM webhooks WHERE id = $1 AND user_id = $2`
	result, err := db.ExecContext(ctx, query, webhookID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete webhook: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("webhook not found or not owned by user")
	}
	
	return nil
}

// UpdateWebhook updates a webhook's forward URL and name for a specific user.
func (db *DB) UpdateWebhook(ctx context.Context, webhookID, userID, forwardURL, name string) error {
	query := `UPDATE webhooks SET forward_url = $1, name = $2 WHERE id = $3 AND user_id = $4`
	result, err := db.ExecContext(ctx, query, forwardURL, name, webhookID, userID)
	if err != nil {
		return fmt.Errorf("failed to update webhook: %w", err)
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	
	if rowsAffected == 0 {
		return fmt.Errorf("webhook not found or not owned by user")
	}
	
	return nil
}

// ClearWebhookRequests deletes all requests for a specific webhook
func (db *DB) ClearWebhookRequests(ctx context.Context, webhookID, userID string) error {
	// First verify ownership
	isOwner, err := db.CheckWebhookOwnership(ctx, webhookID, userID)
	if err != nil {
		return fmt.Errorf("failed to verify ownership: %w", err)
	}
	if !isOwner {
		return fmt.Errorf("user does not own this webhook")
	}

	// Delete all requests for this webhook
	query := `DELETE FROM requests WHERE webhook_id = $1`
	_, err = db.ExecContext(ctx, query, webhookID)
	if err != nil {
		return fmt.Errorf("failed to clear webhook requests: %w", err)
	}

	return nil
}
