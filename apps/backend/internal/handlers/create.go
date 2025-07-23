package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"hookinator/internal/utils"
)

type CreateRequest struct {
	ForwardURL string `json:"forward_url"`
}

func (h *Handler) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	_ = json.NewDecoder(r.Body).Decode(&req) // Optional: ignore error if body is empty

	id, err := utils.GenerateID(12)
	if err != nil {
		http.Error(w, "failed to generate ID", http.StatusInternalServerError)
		return
	}

	if req.ForwardURL != "" {
		if err := h.DB.CreateWebhook(id, req.ForwardURL); err != nil {
			http.Error(w, "failed to create webhook", http.StatusInternalServerError)
			return
		}
	}

	resp := map[string]string{
		"webhook_url": fmt.Sprintf("http://localhost:8080/webhook/%s", id),
		"inspect_url": fmt.Sprintf("http://localhost:8080/inspect/%s", id),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
