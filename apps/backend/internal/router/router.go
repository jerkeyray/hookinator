package router

import (
	"net/http"
	"github.com/go-chi/chi/v5"

	"github.com/jerkeyray/hookinator/handlers"
)

func New() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.logger)
	r.Use(middlare.Recoverer)

	r.Get("/", func(w http.ResponseWriter, r *http.ResponseController)) {
		w.Write([]byte("webhook server is running"))
	}

	r.Post("/webhook/{id}", handlers.HandleWebhook)

	return r
}