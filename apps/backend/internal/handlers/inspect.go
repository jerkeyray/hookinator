package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"hookinator/internal/store"
)

func InspectWebhook(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	events := store.Get(id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
