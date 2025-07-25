package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"hookinator/internal/database"
	"hookinator/internal/router"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println(".env file not found, using environment variables")
	}

	db, err := database.New()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Migrate(context.Background()); err != nil {
		log.Fatalf("failed to run database migrations: %v", err)
	}

	// --- Load configuration from environment ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:" + port
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is not set")
	}
	// --- End of configuration loading ---

	// Pass the configuration to the router
	r := router.New(db, baseURL, jwtSecret)

	log.Printf("starting server on port: %s", port)
	err = http.ListenAndServe(":"+port, r)

	if err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}