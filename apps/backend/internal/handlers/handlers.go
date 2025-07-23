package handlers

import (
	"hookinator/internal/database"
)

// Handler holds the database connection and provides HTTP handlers
type Handler struct {
	DB *database.DB
}

// New creates a new Handler instance with the provided database connection
func New(db *database.DB) *Handler {
	return &Handler{
		DB: db,
	}
}
