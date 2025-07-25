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
	// Table for storing users (assuming this table exists or will be created by your auth system)
	usersTable := `
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`

	// Table for storing webhook configuration (like the forwarding URL)
	webhookTable := `
    CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

	if _, err := db.Exec(usersTable); err != nil {
		return fmt.Errorf("failed to create users table: %w", err)
	}
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

// CreateUserWebhook creates a new webhook entry associated with a user.
func (db *DB) CreateUserWebhook(webhookID, userID, forwardURL string) error {
	// First ensure the user exists
	_, err := db.Exec("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", userID)
	if err != nil {
		return fmt.Errorf("failed to ensure user exists: %w", err)
	}

	query := `INSERT INTO webhooks (id, user_id, forward_url) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET forward_url = $3;`
	_, err = db.Exec(query, webhookID, userID, forwardURL)
	if err != nil {
		return fmt.Errorf("failed to create webhook for user %s: %w", userID, err)
	}
	return nil
}

// GetUserWebhooks retrieves all webhooks for a given user.
func (db *DB) GetUserWebhooks(userID string) ([]map[string]interface{}, error) {
	query := `SELECT id, forward_url, created_at FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC`
	
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get webhooks for user %s: %w", userID, err)
	}
	defer rows.Close()

	var webhooks []map[string]interface{}
	for rows.Next() {
		var id, forwardURL string
		var createdAt time.Time
		
		err := rows.Scan(&id, &forwardURL, &createdAt)
		if err != nil {
			return nil, err
		}
		
		webhook := map[string]interface{}{
			"id":          id,
			"forward_url": forwardURL,
			"created_at":  createdAt,
		}
		
		webhooks = append(webhooks, webhook)
	}

	return webhooks, rows.Err()
}

// GetWebhookRequests retrieves webhook requests from the database for a given webhook ID,
// but only if the webhook belongs to the specified user.
func (db *DB) GetWebhookRequests(webhookID, userID string, limit int) ([]WebhookRequest, error) {
	// First verify that the webhook belongs to the user
	var count int
	checkQuery := `SELECT COUNT(*) FROM webhooks WHERE id = $1 AND user_id = $2`
	err := db.QueryRow(checkQuery, webhookID, userID).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("failed to verify webhook ownership: %w", err)
	}
	if count == 0 {
		return nil, fmt.Errorf("webhook not found or does not belong to user")
	}

	// Now get the requests
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
