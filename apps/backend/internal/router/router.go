package router

import (
	"net/http"

	"hookinator/internal/database"
	"hookinator/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors" // Import the CORS package
)

// The function signature is updated to accept the new configuration
func New(db *database.DB, baseURL, jwtSecret string) http.Handler {
	r := chi.NewRouter()

	// Add CORS middleware to allow requests from your frontend
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "https://your-production-domain.com"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Pass all dependencies to the handlers
	h := handlers.New(db, baseURL, jwtSecret)

	// --- Public Routes (No login required) ---
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("webhook server is running"))
	})
	// The login handler will be public
	r.Post("/auth/google/login", h.HandleGoogleLogin)

	// Receiving webhooks must be public
	r.Post("/webhook/{id}", h.HandleWebhook)

	// --- Protected Routes (Login required) ---
	r.Group(func(r chi.Router) {
		// Apply the authentication middleware to this group
		r.Use(h.AuthMiddleware)

		r.Post("/create", h.CreateWebhook)
		r.Get("/webhook/{id}", h.GetWebhook)
		r.Delete("/webhook/{id}", h.DeleteWebhook)
		r.Get("/inspect/{id}", h.InspectWebhook)
		r.Get("/webhooks", h.ListWebhooks)
	})

	return r
}