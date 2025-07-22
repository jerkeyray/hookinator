package router

import (
    "net/http"
    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"

    "hookinator/internal/handlers"
)

func New() http.Handler {
    r := chi.NewRouter()

    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("webhook server is running"))
    })

    r.Post("/webhook/{id}", handlers.HandleWebhook)
		r.Get("/inspect/{id}", handlers.InspectWebhook)
		r.Post("/create", handlers.CreateWebhook)


    return r
}