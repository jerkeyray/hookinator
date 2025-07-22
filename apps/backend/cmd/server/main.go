package main

import (
	"log"
	"net/http"
	"os"

	"hookinator/internal/router"
	"github.com/joho/godotenv"
)

func main() {
	
	err := godotenv.Load()
	if err != nil {
		log.Println(".env file not found")
	}

	port := os.Getenv("PORT")
	if port == ""{
		port = "8080"
	}

	r := router.New()

	log.Printf("starting server on port: %s", port)
	err = http.ListenAndServe(":"+port, r)

	if err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}