package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"hookinator/internal/utils"
)

func CreateWebhook(w http.ResponseWriter, r *http.Request) {
	id, err := utils.GenerateID(12)
	if err != nil {
		http.Error(w, "failed to generate ID", http.StatusInternalServerError)
		return
	}

	resp := map[string]string{
		"webhook_url": fmt.Sprintf("http://localhost:8080/webhook/%s", id),
		"inspect_url": fmt.Sprintf("http://localhost:8080/inspect/%s", id),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

