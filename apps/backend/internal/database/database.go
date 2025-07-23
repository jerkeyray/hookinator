package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // Postgres driver
)

// DB holds the database connection pool.
type DB struct {
	*sql.DB
}

// WebhookRequest represents a single webhook request captured.
type WebhookRequest struct {
	Timestamp time.Time
	Method    string
	Headers   map[string]string
	Body      string
}

// New connects to the database and returns a DB instance.
func New() (*DB, error) {
	// Get connection string from environment variables
	connStr := fmt.Sprintf("user=%s password=%s host=%s port=%s dbname=%s sslmode=disable",
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

	// Ping the database to verify the connection.
	// We'll retry a few times to give the DB container time to start.
	for i := 0; i < 5; i++ {
		err = db.Ping()
		if err == nil {
			log.Println("Successfully connected to the database.")
			return &DB{db}, nil
		}
		log.Printf("Failed to ping database (attempt %d/5), retrying in 2 seconds... Error: %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	return nil, fmt.Errorf("failed to connect to database after several attempts: %w", err)
}

// Migrate creates the necessary database tables if they don't exist.
func (db *DB) Migrate() error {
	// Table for storing webhook configuration (like the forwarding URL)
	webhookTable := `
    CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(255) PRIMARY KEY,
        forward_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

	// Table for storing individual requests to a webhook
	requestsTable := `
    CREATE TABLE IF NOT EXISTS requests (
        request_id SERIAL PRIMARY KEY,
        webhook_id VARCHAR(255) REFERENCES webhooks(id) ON DELETE CASCADE,
        method VARCHAR(10),
        headers JSONB,
        body TEXT,
        received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

	if _, err := db.Exec(webhookTable); err != nil {
		return fmt.Errorf("failed to create webhooks table: %w", err)
	}
	if _, err := db.Exec(requestsTable); err != nil {
		return fmt.Errorf("failed to create requests table: %w", err)
	}

	log.Println("Database migration completed successfully.")
	return nil
}

// SaveRequest saves a webhook request to the database.
func (db *DB) SaveRequest(webhookID string, req WebhookRequest) error {
	query := `
    INSERT INTO requests (webhook_id, method, headers, body, received_at)
    VALUES ($1, $2, $3, $4, $5)`

	// For now, we'll store headers as a simple string. For real apps, JSONB is better.
	// This is a simplified example. A production app would serialize headers to JSON.
	headersStr := fmt.Sprintf("%v", req.Headers)

	_, err := db.Exec(query, webhookID, req.Method, headersStr, req.Body, req.Timestamp)
	if err != nil {
		return fmt.Errorf("failed to save request for webhook %s: %w", webhookID, err)
	}
	return nil
}

// CreateWebhook creates a new webhook entry and returns its ID.
// For now, we are not using this, but it's here for future use.
func (db *DB) CreateWebhook(id string, forwardURL string) error {
    query := `INSERT INTO webhooks (id, forward_url) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET forward_url = $2;`
    _, err := db.Exec(query, id, forwardURL)
    return err
}

// GetForwardURL retrieves the forwarding URL for a given webhook ID.
func (db *DB) GetForwardURL(webhookID string) (string, error) {
    var forwardURL string
    query := `SELECT forward_url FROM webhooks WHERE id = $1`
    err := db.QueryRow(query, webhookID).Scan(&forwardURL)
    if err != nil {
        if err == sql.ErrNoRows {
            return "", nil // No forward URL set is not an error
        }
        return "", err
    }
    return forwardURL, nil
}

// GetRequests retrieves webhook requests from the database for a given webhook ID
func (db *DB) GetRequests(webhookID string, limit int) ([]WebhookRequest, error) {
    query := `
        SELECT method, headers, body, received_at 
        FROM requests 
        WHERE webhook_id = $1 
        ORDER BY received_at DESC 
        LIMIT $2`
    
    rows, err := db.Query(query, webhookID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var requests []WebhookRequest
    for rows.Next() {
        var req WebhookRequest
        var headersStr string
        
        err := rows.Scan(&req.Method, &headersStr, &req.Body, &req.Timestamp)
        if err != nil {
            return nil, err
        }
        
        // For now, we'll just store headers as a simple string
        // In a production app, you'd parse the JSON back to map[string]string
        req.Headers = map[string]string{"raw": headersStr}
        
        requests = append(requests, req)
    }

    return requests, rows.Err()
}
