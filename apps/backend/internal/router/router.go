package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"hookinator/internal/database"
	"hookinator/internal/handlers"
)

func New(db *database.DB) http.Handler {
    r := chi.NewRouter()

    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Create handlers with database connection
    h := handlers.New(db)

    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("webhook server is running"))
    })

    r.Post("/webhook/{id}", h.HandleWebhook)
    r.Get("/inspect/{id}", h.InspectWebhook)
    r.Post("/create", h.CreateWebhook)

    return r
}