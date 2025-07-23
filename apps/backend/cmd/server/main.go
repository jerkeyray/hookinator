package main

import (
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
		log.Println(".env file not found")
	}

	// Initialize database connection
	db, err := database.New()
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run database migrations
	if err := db.Migrate(); err != nil {
		log.Fatalf("failed to run database migrations: %v", err)
	}

	port := os.Getenv("PORT")
	if port == ""{
		port = "8080"
	}

	r := router.New(db)

	log.Printf("starting server on port: %s", port)
	err = http.ListenAndServe(":"+port, r)

	if err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}