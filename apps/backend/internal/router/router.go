package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"hookinator/internal/database"
	"hookinator/internal/handlers"
	authware "hookinator/internal/middleware" // Import your new auth middleware
)

func New(db *database.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Configure CORS to allow requests from your Next.js frontend
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"}, // Next.js default port
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	h := handlers.New(db) // Assuming handlers.New(db) returns *handlers.Handler

	// --- PUBLIC ROUTES ---
	// These endpoints do not require authentication.
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("API server for Hookinator is running"))
	})
	// This endpoint receives webhooks from external services, so it must be public.
	r.Post("/webhook/{id}", h.HandleWebhook)


	// --- PROTECTED API V1 ROUTES ---
	// All routes inside this group are protected by our AuthMiddleware.
	// They will require a valid JWT from the frontend.
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(authware.AuthMiddleware)

		// Routes for managing webhooks for the authenticated user
		r.Post("/webhooks", h.CreateUserWebhook) // Replaces the old /create route
		r.Get("/webhooks", h.GetUserWebhooks)   // Gets all webhooks for the user

		// This would replace the old /inspect/{id} route, ensuring only the owner can inspect.
		r.Get("/webhooks/{id}/requests", h.GetWebhookRequests) 
	})


	return r
}
