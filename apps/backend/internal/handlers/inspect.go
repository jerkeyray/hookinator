package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (h *Handler) InspectWebhook(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	// Get webhook requests from database (last 50 requests)
	events, err := h.DB.GetRequests(id, 50)
	if err != nil {
		http.Error(w, "failed to get webhook requests", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
