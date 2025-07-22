package handlers

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func HandleWebhook(w http.ResponseWriter, r *http.Request){
	id := chi.URLParam(r, "id")
	fmt.Fprintf(w, "received webhook for id: %s\n", id)
}